import rateLimit from "express-rate-limit";

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Limit each IP to 10 requests per `window` (here, per 15 minutes)
  handler: (req, res /*next*/) => {
    return res.status(429).json({
      error: true,
      message: "You have exceeded the 5 requests in 15 mins limit!",
    });
  },
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
});

export { limiter };
