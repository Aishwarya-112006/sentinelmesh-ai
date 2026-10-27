package sentinelmesh.authz_test

import data.sentinelmesh.authz
import rego.v1

test_red_can_submit_payload_to_gateway if {
	authz.allow with input as {"source": "red", "destination": "gateway", "action": "submit_payload"}
}

test_blue_can_propose_patch if {
	authz.allow with input as {"source": "blue", "destination": "gateway", "action": "propose_patch"}
}

test_red_cannot_reach_model_directly if {
	not authz.allow with input as {"source": "red", "destination": "model", "action": "direct_access"}
}

test_red_cannot_reach_blue if {
	not authz.allow with input as {"source": "red", "destination": "blue", "action": "anything"}
}

test_blue_cannot_reach_model if {
	not authz.allow with input as {"source": "blue", "destination": "model", "action": "direct_access"}
}

test_unknown_action_is_denied if {
	not authz.allow with input as {"source": "red", "destination": "gateway", "action": "delete_everything"}
}