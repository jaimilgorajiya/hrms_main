import mongoose from "mongoose";

const gradeSchema = new mongoose.Schema({
    name: { 
        type: String, 
        required: true, 
        unique: true 
    },
    // e.g., 'Junior', 'Senior', 'Manager'
    basicSalaryRange: { 
        min: { type: Number, default: 0 }, 
        max: { type: Number, default: 0 } 
    },
    benefits: [{ type: String }],
    description: { type: String }
}, {
    timestamps: true
});

const Grade = mongoose.model("Grade", gradeSchema);

export default Grade;
