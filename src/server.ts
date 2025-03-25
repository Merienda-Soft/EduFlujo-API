import express from 'express';

const app = express();

// see data
app.use(express.json());

app.get('/', (req,res) => {
    res.status(200).send("Hello world")
})

export default app;