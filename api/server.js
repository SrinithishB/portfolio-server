const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const multer = require('multer');
const { v2: cloudinary } = require('cloudinary');
const { CloudinaryStorage } = require('multer-storage-cloudinary');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

// MongoDB connection
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('MongoDB connected'))
  .catch((err) => console.error('MongoDB connection error:', err));

// Cloudinary config
cloudinary.config({
  cloud_name: process.env.CLOUD_NAME,
  api_key: process.env.CLOUD_API_KEY,
  api_secret: process.env.CLOUD_API_SECRET
});

// Cloudinary storage setup
const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'projects',
    allowed_formats: ['jpg', 'jpeg', 'png', 'gif']
  }
});
const upload = multer({ storage });

// Mongo Schema
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

// Routes
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
  if (!title || !description || !url || !req.file) {
    return res.status(400).json({ error: 'All fields (title, description, url, image) are required' });
  }

  const newProject = new Project({
    title,
    description,
    url,
    imagePath: req.file.path
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
      project.imagePath = image.path;
    }

    await project.save();
    res.json({ message: 'Project updated', data: project });
  } catch (err) {
    res.status(500).json({ error: 'Error updating project' });
  }
});

module.exports = app;
