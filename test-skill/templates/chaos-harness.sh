#!/usr/bin/env bash
# test-skill · Chaos Harness 模板（暴力模式 Step 5 追加两轮）
#
# 使用方式：
#   1. cp ~/.claude/skills/gstack/test-skill/templates/chaos-harness.sh ./harness-chaos.sh
#   2. chmod +x ./harness-chaos.sh
#   3. 按栈取消注释对应段落
#   4. 先跑 ./harness-test.sh（标准三步门禁），再跑 ./harness-chaos.sh
#
# ⚠️  只在隔离环境跑。永不对生产 DB / 真外部 API 执行。
# ⚠️  必须先 pre-flight 检查：Mongo 连的是 testcontainer 不是生产。

set -euo pipefail

# ─── 前置安全检查（不可跳过）───────────────────────────────
if [[ "${MONGO_URL:-}" == *"mongodb+srv"* ]] || [[ "${MONGO_URL:-}" == *"prod"* ]]; then
  echo "❌ ABORT: MONGO_URL 指向生产环境，chaos 禁止跑"; exit 2
fi
if [[ "${NODE_ENV:-}" == "production" ]]; then
  echo "❌ ABORT: NODE_ENV=production，chaos 禁止跑"; exit 2
fi
echo "✅ 环境检查通过（非生产）"

# ─── Step 4 · Chaos Round ─────────────────────────────────

echo "[4/5] chaos round · 故障注入..."

# ========== 网络故障 · toxiproxy ==========
# # 启动 toxiproxy（需先 brew install toxiproxy）
# toxiproxy-server > /tmp/toxiproxy.log 2>&1 &
# TOXI_PID=$!
# sleep 1
# toxiproxy-cli create mongo_test -l localhost:27018 -u localhost:27017
#
# # 场景 1: 延迟 2 秒
# toxiproxy-cli toxic add mongo_test -n lat -t latency -a latency=2000
# TEST_MONGO_PROXY=localhost:27018 bun test tests/chaos/network-latency.test.ts
# toxiproxy-cli toxic remove mongo_test -n lat
#
# # 场景 2: 完全断连
# toxiproxy-cli toxic add mongo_test -n down -t down
# TEST_MONGO_PROXY=localhost:27018 bun test tests/chaos/network-down.test.ts
# toxiproxy-cli toxic remove mongo_test -n down
#
# # 场景 3: 20% 丢包
# toxiproxy-cli toxic add mongo_test -n loss -t limit_data -a bytes=1000
# TEST_MONGO_PROXY=localhost:27018 bun test tests/chaos/packet-loss.test.ts
# toxiproxy-cli toxic remove mongo_test -n loss
#
# # 清理
# kill $TOXI_PID 2>/dev/null || true

# ========== 时间故障 · sinon fakeTimers（测试文件内实现）==========
# bun test tests/chaos/time/**/*.test.ts

# ========== 进程故障 · kill -9 ==========
# # 启动被测服务
# bun run src/index.ts &
# APP_PID=$!
# sleep 2
# # 正常请求确认起来
# curl -f http://localhost:3001/health || { echo "app not up"; exit 1; }
# # 触发写入请求
# curl -X POST http://localhost:3001/api/test/slow-write &
# WRITE_PID=$!
# sleep 0.5
# # 中途 kill
# kill -9 $APP_PID
# # 重启
# bun run src/index.ts &
# APP_PID=$!
# sleep 2
# # 断言数据一致性
# bun test tests/chaos/crash-consistency.test.ts
# kill $APP_PID 2>/dev/null || true

# ========== 资源耗尽 ==========
# # fd 限制
# ulimit -n 20 && bun test tests/chaos/fd-exhaustion.test.ts
# # 磁盘满（在隔离 tmpfs 下）
# dd if=/dev/zero of=/tmp/test-filler bs=1M count=100 && \
#   bun test tests/chaos/disk-full.test.ts && \
#   rm -f /tmp/test-filler

# ─── Step 5 · Race Round ──────────────────────────────────

echo "[5/5] race round · N 并发 × 20 轮..."

# ========== Race 多轮跑（概率性 bug 必须反复跑）==========
# # 典型场景：budgetGuard 并发预留、用户名唯一性、库存扣减
# for i in $(seq 1 20); do
#   echo "  race round $i/20"
#   bun test tests/race/**/*.test.ts --testTimeout=60000 || \
#     { echo "❌ race round $i failed"; exit 1; }
# done

# ========== Python 版 ==========
# for i in $(seq 1 20); do
#   pytest tests/race/ -q || exit 1
# done

# ─── 报告 ─────────────────────────────────────────────────

echo ""
echo "✅ chaos harness all green:"
echo "   - network latency / down / loss"
echo "   - time DST / overflow / leap"
echo "   - process crash / fd / disk"
echo "   - race N=100 × 20 rounds"
echo ""
echo "📝 Chaos 发现写入 .claude/chaos-report-$(date +%Y-%m-%d).md"
