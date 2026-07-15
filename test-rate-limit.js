import rateLimit from "express-rate-limit";
try {
  rateLimit({ validate: { xForwardedForHeader: false, default: false } });
  console.log("Success");
} catch (e) {
  console.error(e);
}
