Check if dev servers are running and healthy.

Steps:
1. Read docs/snapshot.md to get expected ports
2. Run: lsof -i :[frontend-port] and lsof -i :[backend-port]
3. If a server is down, report which one and the last known start command
4. If both are up, confirm ports and report OK

Keep output to 3 lines max.
