const express = require('express');
const mongoose = require('mongoose');
const multer = require('multer');
const path = require('path');
const cors = require('cors');

// Express app
const app = express();
app.use(cors());
app.use(express.json());

// MongoDB connection
require('dotenv').config();
mongoose.connect(process.env.MONGODB_URI)
    .then(() => console.log('MongoDB connected'))
    .catch((err) => console.error('MongoDB connection error:', err));

// Schema
const ProjectSchema = new mongoose.Schema({
    title: String,
    description: String,
    url: String,
    imagePath: String,
    createdAt: {
        type: Date,
        default: Date.now
    }
});
const Project = mongoose.model('Project', ProjectSchema);

// Multer (NOTE: This works only locally; not on Vercel)
const storage = multer.memoryStorage(); // using memoryStorage for Vercel compatibility
const upload = multer({ storage });

// API Routes
app.get('/', async (req, res) => {
    try {
        const projects = await Project.find().sort({ createdAt: -1 });
        res.status(200).json(projects);
    } catch (err) {
        res.status(500).json({ error: 'Error fetching projects' });
    }
});

app.post('/', upload.single('image'), async (req, res) => {
    const { title, description, url } = req.body;
    const image = req.file;

    if (!title || !description || !url || !image) {
        return res.status(400).json({ error: 'All fields (title, description, url, image) are required' });
    }

    // In production, you'd upload the image to Cloudinary, S3, etc., and save the URL
    const newProject = new Project({
        title,
        description,
        url,
        imagePath: 'https://via.placeholder.com/300' // Replace with real image URL
    });

    try {
        const saved = await newProject.save();
        res.status(201).json({ message: 'Project saved', data: saved });
    } catch (err) {
        res.status(500).json({ error: 'Database save failed' });
    }
});

app.delete('/:id', async (req, res) => {
    try {
        const project = await Project.findByIdAndDelete(req.params.id);
        if (!project) return res.status(404).json({ error: 'Project not found' });

        res.json({ message: 'Project deleted' });
    } catch (err) {
        res.status(500).json({ error: 'Error deleting project' });
    }
});

app.put('/:id', upload.single('image'), async (req, res) => {
    try {
        const { title, description, url } = req.body;
        const image = req.file;
        const project = await Project.findById(req.params.id);

        if (!project) return res.status(404).json({ error: 'Project not found' });

        project.title = title || project.title;
        project.description = description || project.description;
        project.url = url || project.url;

        if (image) {
            project.imagePath = 'https://via.placeholder.com/300'; // replace with real URL
        }

        await project.save();
        res.json({ message: 'Project updated', data: project });
    } catch (err) {
        res.status(500).json({ error: 'Error updating project' });
    }
});

module.exports = app;
