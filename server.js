const express = require('express');
const multer = require('multer');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
require('dotenv').config();


const app = express();
app.use(cors());
app.use(express.json());

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true
}).then(() => {
    console.log('MongoDB connected');
}).catch((err) => {
    console.error('MongoDB connection error:', err);
});

// Create uploads folder if not exists
const uploadDir = 'uploads';
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir);
}

// Multer setup
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'uploads/');
    },
    filename: function (req, file, cb) {
        cb(null, Date.now() + path.extname(file.originalname));
    }
});

const fileFilter = (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|svg\+xml/;
    const isValid = allowedTypes.test(file.mimetype.toLowerCase());
    isValid ? cb(null, true) : cb(new Error('Only image files (jpeg, png, gif, svg) are allowed!'));
};

const upload = multer({ storage, fileFilter });

// MongoDB Schema
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

// API to upload and save
app.post('/', upload.single('image'), async (req, res) => {
    const { title, description, url } = req.body;
    const image = req.file;

    if (!title || !description || !url || !image) {
        return res.status(400).json({ error: 'All fields (title, description, url, image) are required' });
    }

    const newProject = new Project({
        title,
        description,
        url,
        imagePath: `/uploads/${image.filename}`
    });

    try {
        const saved = await newProject.save();
        res.status(201).json({ message: 'Project saved successfully', data: saved });
    } catch (err) {
        res.status(500).json({ error: 'Error saving to database' });
    }
});
app.get('/', async (req, res) => {
    try {
        const projects = await Project.find().sort({ createdAt: -1 }); // newest first
        res.status(200).json(projects);
    } catch (err) {
        res.status(500).json({ error: 'Error fetching projects from database' });
    }
});
app.delete('/:id', async (req, res) => {
    try {
        const project = await Project.findByIdAndDelete(req.params.id);
        if (!project) return res.status(404).json({ error: 'Project not found' });

        // delete image from uploads folder
        if (project.imagePath) {
            const imagePath = path.join(__dirname, project.imagePath);
            fs.unlink(imagePath, (err) => {
                if (err) console.error('Error deleting image:', err);
            });
        }

        res.json({ message: 'Project deleted successfully' });
    } catch (err) {
        res.status(500).json({ error: 'Error deleting project' });
    }
});
app.put('/:id', upload.single('image'), async (req, res) => {
    try {
        const { title, description, url } = req.body;
        const project = await Project.findById(req.params.id);
        if (!project) return res.status(404).json({ error: 'Project not found' });

        project.title = title || project.title;
        project.description = description || project.description;
        project.url = url || project.url;

        if (req.file) {
            // Delete old image
            if (project.imagePath) {
                const oldPath = path.join(__dirname, project.imagePath);
                fs.unlink(oldPath, (err) => {
                    if (err) console.error('Failed to delete old image');
                });
            }
            project.imagePath = `/uploads/${req.file.filename}`;
        }

        await project.save();
        res.json({ message: 'Project updated successfully', data: project });
    } catch (err) {
        res.status(500).json({ error: 'Error updating project' });
    }
});
// Serve image statically
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Start server
app.listen(1000, () => {
    console.log('Server running on port 1000');
});
