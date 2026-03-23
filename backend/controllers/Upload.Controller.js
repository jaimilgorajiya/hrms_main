const uploadFile = (req, res) => {
    if (!req.file) {
        return res.status(400).json({ success: false, message: "No file uploaded" });
    }
    
    // Construct the file URL (assuming express serves static from public)
    const fileUrl = `${req.protocol}://${req.get('host')}/uploads/${req.file.filename}`;
    
    res.status(200).json({ 
        success: true, 
        message: "File uploaded successfully", 
        fileUrl: fileUrl,
        filename: req.file.filename
    });
};

export { uploadFile };
