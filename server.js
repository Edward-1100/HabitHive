const app = require('./app');
const PORT = process.env.PORT || 3000;

if (app && typeof app.listen === 'function') {
  app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
} else {
  require('./app');
}
