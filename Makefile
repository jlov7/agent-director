verify:
	./scripts/verify.sh

verify-strict:
	./scripts/verify.sh --strict

verify-ux:
	./scripts/verify-ux.sh

doctor:
	python3 ./scripts/doctor.py

scorecard:
	python3 ./scripts/scorecard.py --refresh

vercel-check:
	./scripts/vercel_release_check.sh

cold-start-budget:
	python3 ./scripts/cold_start_budget.py

reliability-drills:
	python3 ./scripts/reliability_drills.py

release-safety:
	./scripts/release_safety_ops.sh preflight
