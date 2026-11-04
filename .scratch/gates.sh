set -u
run() { echo "=== $*"; "$@" > .scratch/gate.log 2>&1; rc=$?; echo "exit $rc"; if [ $rc -ne 0 ]; then tail -40 .scratch/gate.log; fi; }
run npm ci --no-audit --no-fund
run npm run build:all
run npm test -w @tensor_1/react
run npm run typecheck -w @tensor_1/react
run npm run test:performance
run npm run test:size
run npm run test:parity
run npm run test:contract
run npm run test:tokens
run npm run test:api
run npm run test:smoke
echo "--- a11y job"
run npm ci --no-audit --no-fund
run npm run build
run npm run test:a11y
run node --test packages/tokens/docs/docs.test.js packages/tokens/guide/app.test.js
run node tests/docs/verify-components.mjs
run npm run size:css -w @tensor_1/tokens
echo DONE
