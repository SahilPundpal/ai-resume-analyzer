import axios from "axios";
import { useState } from "react";

function Home() {
  const [file, setFile] = useState(null);
  const [analysis, setAnalysis] = useState("");

  const handleFileChange = (e) => {
    setFile(e.target.files[0]);
  };

  const handleUpload = async () => {

  if (!file) {
    alert("Please select a resume first");
    return;
  }

  const formData = new FormData();
  formData.append("resume", file);

  try {

    const response = await axios.post(
      "http://localhost:5000/upload",
      formData,
      {
        headers: {
          "Content-Type": "multipart/form-data"
        }
      }
    );

    alert("Resume uploaded successfully!");
    setAnalysis(response.data.analysis);
    console.log(response.data);

  } catch (error) {

    console.error(error.response?.data || error);
    alert("Upload failed");

  }

};

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-white flex flex-col items-center justify-center">

      <h1 className="text-5xl font-bold mb-3">
        AI Resume Analyzer 🚀
      </h1>

      <p className="text-gray-400 mb-10 text-lg">
        Upload your resume and get AI insights
      </p>

      <div className="bg-gray-800/80 backdrop-blur-md p-10 rounded-2xl shadow-xl border border-gray-700 w-[400px]">

        <input
          type="file"
          accept=".pdf"
          onChange={handleFileChange}
          className="mb-6 text-white"
        />
        {file && (
          <p className="text-green-400 text-sm mb-4">
            Selected: {file.name}
          </p>
        )}

        <button
          onClick={handleUpload}
          className="w-full bg-blue-600 hover:bg-blue-700 transition duration-300 px-4 py-3 rounded-lg font-semibold"
        >
          Analyze Resume
        </button>

        {analysis && (
          <div className="mt-6 bg-gray-800 p-6 rounded-xl w-[500px] border border-gray-700">
            <h2 className="text-xl font-semibold mb-3 text-blue-400">
              AI Resume Analysis
            </h2>

            <pre className="text-gray-300 whitespace-pre-wrap text-sm">
              {analysis}
            </pre>
          </div>
        )}

      </div>

    </div>
  );
}

export default Home;