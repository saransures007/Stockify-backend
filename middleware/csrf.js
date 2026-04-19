// middleware/csrf.js
const csrf = require('csurf');
const csrfProtection = csrf({ cookie: true });

// Apply to vote routes
router.post('/:requestId/vote', csrfProtection, voteProductRequest);