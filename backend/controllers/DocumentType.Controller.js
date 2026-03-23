import DocumentType from '../models/DocumentType.Model.js';

export const getDocumentTypes = async (req, res) => {
    try {
        const adminId = req.user._id;
        const documents = await DocumentType.find({ adminId }).sort({ createdAt: -1 });
        res.status(200).json({ success: true, documentTypes: documents });
    } catch (error) {
        console.error("Error in getDocumentTypes:", error);
        res.status(500).json({ success: false, message: "Internal Server Error" });
    }
};

export const createDocumentType = async (req, res) => {
    try {
        const adminId = req.user._id;
        const newDoc = new DocumentType({
            ...req.body,
            adminId
        });
        await newDoc.save();
        res.status(201).json({ success: true, message: "Document type created successfully", data: newDoc });
    } catch (error) {
        console.error("Error in createDocumentType:", error);
        res.status(500).json({ success: false, message: "Internal Server Error" });
    }
};

export const updateDocumentType = async (req, res) => {
    try {
        const adminId = req.user._id;
        const { id } = req.params;
        const updatedDoc = await DocumentType.findOneAndUpdate(
            { _id: id, adminId },
            { $set: req.body },
            { new: true }
        );
        if (!updatedDoc) {
            return res.status(404).json({ success: false, message: "Document type not found" });
        }
        res.status(200).json({ success: true, message: "Document type updated successfully", data: updatedDoc });
    } catch (error) {
        console.error("Error in updateDocumentType:", error);
        res.status(500).json({ success: false, message: "Internal Server Error" });
    }
};

export const deleteDocumentType = async (req, res) => {
    try {
        const adminId = req.user._id;
        const { id } = req.params;
        const deletedDoc = await DocumentType.findOneAndDelete({ _id: id, adminId });
        if (!deletedDoc) {
            return res.status(404).json({ success: false, message: "Document type not found" });
        }
        res.status(200).json({ success: true, message: "Document type deleted successfully" });
    } catch (error) {
        console.error("Error in deleteDocumentType:", error);
        res.status(500).json({ success: false, message: "Internal Server Error" });
    }
};

export const bulkDeleteDocumentTypes = async (req, res) => {
    try {
        const adminId = req.user._id;
        const { ids } = req.body;
        await DocumentType.deleteMany({ _id: { $in: ids }, adminId });
        res.status(200).json({ success: true, message: "Document types deleted successfully" });
    } catch (error) {
        console.error("Error in bulkDeleteDocumentTypes:", error);
        res.status(500).json({ success: false, message: "Internal Server Error" });
    }
};

export const toggleDocumentStatus = async (req, res) => {
    try {
        const adminId = req.user._id;
        const { id } = req.params;
        const doc = await DocumentType.findOne({ _id: id, adminId });
        if (!doc) {
            return res.status(404).json({ success: false, message: "Document type not found" });
        }
        doc.status = !doc.status;
        await doc.save();
        res.status(200).json({ success: true, message: "Status updated", status: doc.status });
    } catch (error) {
        console.error("Error in toggleDocumentStatus:", error);
        res.status(500).json({ success: false, message: "Internal Server Error" });
    }
};
