import { SanitizationUtils } from '../utils/SanitizationUtils';

const payload = {
    url: "/api/test?q=<script>alert(1)</script>",
    headers: {
        "user-agent": "Mozilla/5.0 <img src=x onerror=alert(2)>"
    },
    nested: {
        danger: "' OR '1'='1"
    }
};

const sanitized = SanitizationUtils.deepClean(payload);
console.log("ORIGINAL:", JSON.stringify(payload, null, 2));
console.log("SANIITZED:", JSON.stringify(sanitized, null, 2));

if (sanitized.url.includes("<script>")) {
    console.error("TEST FAILED: Script tag still present!");
    process.exit(1);
} else {
    console.log("TEST PASSED: Strings escaped correctly.");
}
