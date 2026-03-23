import mongoose from "mongoose";

const employmentTypeSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: true,
            unique: true,
            trim: true
        },
        description: {
            type: String,
            trim: true
        }
    },
    {
        timestamps: true
    }
);

const EmploymentType = mongoose.model("EmploymentType", employmentTypeSchema);

export default EmploymentType;
