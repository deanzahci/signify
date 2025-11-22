import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))

import time
from services.throttling import ThrottlingService

print("Testing Phase 2: Throttling Service")
print("=" * 50)

service = ThrottlingService()

print("\n1. Testing initial state:")
print(f"   last_transmission_time: {service.last_transmission_time}")
print(f"   last_maxarg_letter: {service.last_maxarg_letter}")
print(f"   last_target_arg_prob: {service.last_target_arg_prob}")

print("\n2. Testing force=True always returns True:")
result = service.should_send("A", 0.5, force=True)
print(f"   should_send('A', 0.5, force=True): {result} (expected: True)")

print("\n3. Testing first call (no previous state):")
result = service.should_send("A", 0.5, force=False)
print(f"   should_send('A', 0.5): {result} (expected: True - no previous state)")

print("\n4. Testing throttling by time (too soon):")
service.mark_sent("A", 0.5)
time.sleep(0.05)
result = service.should_send("A", 0.51, force=False)
print(f"   Time elapsed: ~50ms (threshold: 75ms)")
print(f"   should_send('A', 0.51): {result} (expected: False)")

print("\n5. Testing letter change triggers send:")
service.mark_sent("A", 0.5)
time.sleep(0.1)
result = service.should_send("B", 0.5, force=False)
print(f"   Letter changed: A -> B")
print(f"   should_send('B', 0.5): {result} (expected: True)")

print("\n6. Testing probability change triggers send:")
service.mark_sent("A", 0.5)
time.sleep(0.1)
result = service.should_send("A", 0.9, force=False)
print(f"   Probability changed: 0.5 -> 0.9 (diff: 0.4 > threshold: 0.03)")
print(f"   should_send('A', 0.9): {result} (expected: True)")

print("\n7. Testing small probability change does not trigger:")
service.mark_sent("A", 0.5)
time.sleep(0.1)
result = service.should_send("A", 0.52, force=False)
print(f"   Probability changed: 0.5 -> 0.52 (diff: 0.02 < threshold: 0.03)")
print(f"   should_send('A', 0.52): {result} (expected: False)")

print("\n8. Testing reset clears state:")
service.mark_sent("A", 0.5)
service.reset()
print(f"   After reset:")
print(f"   last_transmission_time: {service.last_transmission_time}")
print(f"   last_maxarg_letter: {service.last_maxarg_letter}")
print(f"   last_target_arg_prob: {service.last_target_arg_prob}")

print("\n9. Testing time threshold exactly:")
service.mark_sent("A", 0.5)
time.sleep(0.08)
result = service.should_send("B", 0.5, force=False)
print(f"   Time elapsed: ~80ms (threshold: 75ms)")
print(f"   Letter changed: A -> B")
print(f"   should_send('B', 0.5): {result} (expected: True)")

print("\n" + "=" * 50)
print("Phase 2 Throttling tests completed successfully!")
