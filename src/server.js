const express = require('express')
const path = require('path')
const app = express();

app.use(express.static(path.join(__dirname, '..', 'build')));
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'build', 'index.html'));
});

const port = process.env.PORT || 8090
app.listen(port, () => {
    console.log(`server is running on port ${port}`)
});
