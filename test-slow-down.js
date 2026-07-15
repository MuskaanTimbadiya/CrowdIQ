import slowDown from "express-slow-down";
try {
  slowDown({
    delayAfter: 3,
    delayMs: (hits) => 1000 * hits,
    validate: { xForwardedForHeader: false, default: false },
    keyGenerator: () => '1'
  });
  console.log("Success");
} catch (e) {
  console.error(e);
}
