import { foodPlaybookAudit } from "../src/village-playbooks.js";

const result = foodPlaybookAudit();
console.log(JSON.stringify(result, null, 2));
if (!result.valid) process.exitCode = 1;
