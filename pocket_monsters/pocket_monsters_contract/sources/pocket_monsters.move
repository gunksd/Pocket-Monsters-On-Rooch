/// Pocket Monsters On Rooch 是一个基于比特币Layer2——Rooch网络的游戏生态系统。
/// 用户通过花费gas在比特币网络上mint生成随机属性和种类的宠物，并在Rooch网络上培养、训练和对战。宠物记录在比特币的Inscription中，可进行交易和转移。
/// 1. 宠物生成：用户花费gas在比特币网络上mint随机宠物，记录在Inscription中。
/// 2. 宠物培养和训练：在Rooch网络上培养和训练宠物，提升等级和技能。
/// 3. 宠物对战：用户发起宠物对战，对战状态记录在Inscription的临时状态区域，胜利者获得代币或者经验值奖励。
/// 4. 任务和探索：用户可以通过完成任务和世界探索活动，达成一定成就之后可以获得代币和稀有物品奖励。
/// 5. 宠物交易：可以开放宠物交易市场，稀有宠物可以进行交易，通过Inscription转移实现所有权变更。
module bitcoin_monsters::monsters {

    use std::vector;
    use moveos_std::tx_context;
    use moveos_std::object::{Self, Object};
    use moveos_std::timestamp;
    use bitcoin_move::ord::{Self, Inscription};
    use moveos_std::rand;

    const ErrorNotMonster: u64 = 0;
    const ErrorAlreadyTrained: u64 = 1;
    const ErrorNotTrained: u64 = 2;
    const ErrorBattleTooFrequently: u64 = 3;
    const ErrorMonsterExhausted: u64 = 4;

    const BATTLE_INTERVAL: u64 = 60 * 60 * 24; // 1 day
    const MAX_VARIETIES: u64 = 5; // 假设有5种宠物种类
    const MAX_HEALTH: u8 = 100;
    const MAX_LEVEL: u64 = 100;

    /// 宠物的基本属性
    struct Monster has key, store {
        variety: u64,
        level: u64,
        experience: u64,
        health: u8,
        last_training_time: u64,
        last_battle_time: u64,
        wins: u64,
        losses: u64,
    }

    /// 用户对宠物的操作
    struct Actions has store, copy, drop {
        creation_time: u64,
        training_time: vector<u64>,
        battle_time: vector<u64>,
        task_completion: vector<u64>,
    }

    fun init() {}

    /// 生成新的宠物
    public entry fun mint_monster(seed: &mut Object<Inscription>) {
        let inscription = object::borrow(seed);
        ensure_monster_inscription(inscription);

        assert!(!ord::contains_permanent_state<Monster>(seed), ErrorAlreadyTrained);
        
        let monster = Monster {
            variety: generate_random_variety(),
            level: 1,
            experience: 0,
            health: generate_random_health(),
            last_training_time: timestamp::now_seconds(),
            last_battle_time: 0,
            wins: 0,
            losses: 0,
        };

        ord::add_permanent_state(seed, monster);

        let actions = Actions {
            creation_time: timestamp::now_seconds(),
            training_time: vector::empty(),
            battle_time: vector::empty(),
            task_completion: vector::empty(),
        };
        ord::add_temp_state(seed, actions);
    }

    /// 训练宠物
    public entry fun train_monster(monster: &mut Object<Inscription>) {
        let mut monster_data = ord::borrow_mut_permanent_state<Monster>(monster);
        let now = timestamp::now_seconds();
        assert!(now - monster_data.last_training_time >= BATTLE_INTERVAL, ErrorBattleTooFrequently);
        
        monster_data.experience += calculate_experience_gain();
        monster_data.level = calculate_level(monster_data.experience);
        monster_data.health = calculate_health(monster_data.health, now - monster_data.last_training_time);
        monster_data.last_training_time = now;

        let mut actions = ord::borrow_mut_temp_state<Actions>(monster);
        vector::push_back(&mut actions.training_time, now);
    }

    /// 发起宠物对战
    public entry fun battle(monster: &mut Object<Inscription>, opponent: &mut Object<Inscription>) {
        let mut monster_data = ord::borrow_mut_permanent_state<Monster>(monster);
        let mut opponent_data = ord::borrow_mut_permanent_state<Monster>(opponent);

        assert!(monster_data.health > 0 && opponent_data.health > 0, ErrorMonsterExhausted);

        let now = timestamp::now_seconds();
        assert!(now - monster_data.last_battle_time >= BATTLE_INTERVAL, ErrorBattleTooFrequently);
        assert!(now - opponent_data.last_battle_time >= BATTLE_INTERVAL, ErrorBattleTooFrequently);

        // Simulate the battle outcome (simple logic for demonstration)
        let outcome = simulate_battle(monster_data, opponent_data);
        match outcome {
            1 => {
                monster_data.wins += 1;
                opponent_data.losses += 1;
            },
            2 => {
                monster_data.losses += 1;
                opponent_data.wins += 1;
            },
            _ => {}
        }

        monster_data.last_battle_time = now;
        opponent_data.last_battle_time = now;

        let mut actions = ord::borrow_mut_temp_state<Actions>(monster);
        vector::push_back(&mut actions.battle_time, now);
    }

    public fun do_task(monster: &mut Object<Inscription>, task_id: u64): vector<u64> {
        let monster_data = ord::borrow_mut_permanent_state<Monster>(monster);
        assert!(monster_data.health > 0, ErrorMonsterExhausted);

        let reward = complete_task(task_id);

        let mut actions = ord::borrow_mut_temp_state<Actions>(monster);
        vector::push_back(&mut actions.task_completion, task_id);

        reward
    }

    public fun transfer_ownership(monster: &mut Object<Inscription>, new_owner: address) {
        let monster_data = ord::borrow_mut_permanent_state<Monster>(monster);
        assert!(monster_data.health > 0, ErrorMonsterExhausted);

        // 通过Inscription转移所有权
        object::transfer(monster, new_owner);
    }

    public fun is_monster(_inscription: &Inscription): bool {
        // TODO: Parse the Inscription content and check if it is a valid Monster
        true
    }

    public fun generate_random_variety(): u64 {
        // 生成一个随机的宠物种类
        rand::random_u64() % MAX_VARIETIES
    }

    public fun generate_random_health(): u8 {
        // 生成一个随机的健康值
        (rand::random_u64() % (MAX_HEALTH as u64)) as u8
    }

    public fun calculate_experience_gain(): u64 {
        // TODO: Implement logic to calculate experience gain from training or battles
        10
    }

    public fun calculate_level(experience: u64): u64 {
        // 使用经验值来计算等级
        experience / 100 + 1
    }

    public fun calculate_health(current_health: u8, _time_since_last_action: u64): u8 {
        // 可以实现健康值的递减或恢复逻辑
        current_health
    }

    fun ensure_monster_inscription(inscription: &Inscription) {
        assert!(is_monster(inscription), ErrorNotMonster);
    }

    fun simulate_battle(_monster: &Monster, _opponent: &Monster) -> u8 {
        // 简单的战斗模拟逻辑
        1 // 1 for monster win, 2 for opponent win, 0 for draw
    }

    fun complete_task(_task_id: u64) -> vector<u64> {
        // 完成任务并获得奖励
        vector::empty()
    }

    #[test_only]
    use std::option;

    #[test_only]
    use rooch_framework::genesis;

    #[test]
    fun test() {
        genesis::init_for_test();
        let inscription_obj = ord::new_inscription_object_for_test(
            @0x3232423,
            0,
            0,
            vector::empty(),
            option::none(),
            option::none(),
            vector::empty(),
            option::none(),
            vector::empty(),
            option::none(),
        );

        mint_monster(&mut inscription_obj);

        let mut i = 0u8;
        loop {
            timestamp::fast_forward_seconds_for_test(BATTLE_INTERVAL);
            train_monster(&mut inscription_obj);
            i = i + 1;
            if (i == 10) break;
        };

        let rewards = do_task(&mut inscription_obj, 1);
        assert!(vector::length(&rewards) > 0, 1);

        let monster = ord::remove_permanent_state<Monster>(&mut inscription_obj);
        ord::destroy_permanent_area(&mut inscription_obj);

        // 断言宠物属性与操作结果符合预期
        assert!(monster.level > 0, 1);
    }
}
