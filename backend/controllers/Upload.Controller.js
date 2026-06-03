const uploadFile = (req, res) => {
    if (!req.file) {
        return res.status(400).json({ success: false, message: "No file uploaded" });
    }
    
    const host = req.get('host') || '';
    const isLocal = host.includes('localhost') || host.includes('127.0.0.1') || host.startsWith('192.168.') || host.startsWith('10.') || host.startsWith('172.');
    const proto = (req.headers['x-forwarded-proto'] || req.protocol || 'http').split(',')[0].trim();
    const finalProtocol = !isLocal ? 'https' : proto;

    const fileUrl = `${finalProtocol}://${host}/uploads/${req.file.filename}`;
    
    res.status(200).json({ 
        success: true, 
        message: "File uploaded successfully", 
        fileUrl: fileUrl,
        filename: req.file.filename
    });
};

export { uploadFile };
