# SentinelMesh authorisation policy: DEFAULT DENY.
# A request is allowed only if an explicit rule below matches.
package sentinelmesh.authz

import rego.v1

default allow := false

# Red Team may submit payloads to the gateway (never to the model directly).
allow if {
	input.source == "red"
	input.destination == "gateway"
	input.action == "submit_payload"
}

# Blue Team may propose defense patches to the gateway.
allow if {
	input.source == "blue"
	input.destination == "gateway"
	input.action == "propose_patch"
}