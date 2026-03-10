import axios from "axios";
import { useState } from "react";

function Home() {
  const [file, setFile] = useState(null);
  const [analysis, setAnalysis] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleFileChange = (e) => {
    setFile(e.target.files[0]);
  };

  const handleUpload = async () => {

  if (!file) {
    alert("Please select a resume first");
    return;
  }

  if (loading) return;
  setLoading(true);

  const formData = new FormData();
  formData.append("resume", file);

  try {

    const response = await axios.post(
      "http://localhost:5000/upload",
      formData,
      {
        headers: {
          "Content-Type": "multipart/form-data"
        },
        timeout: 120000
      }
    );

    alert("Resume uploaded successfully!");
    try {
      const parsed = JSON.parse(response.data.analysis);
      setAnalysis(parsed);
    } catch (err) {
      console.error("JSON parse error:", err);
      setAnalysis({ score: "-", skills: [], strengths: [], improvements: [] });
    }
    console.log(response.data);

  } catch (error) {

    console.error(error.response?.data || error);
    alert(error.response?.data?.message || "Upload failed");

  } finally {
    setLoading(false);
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

      <div className="bg-gray-800/80 backdrop-blur-md p-10 rounded-2xl shadow-xl border border-gray-700 w-full">

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
          disabled={loading}
          className={`w-full transition duration-300 px-4 py-3 rounded-lg font-semibold ${loading ? 'bg-blue-800 cursor-not-allowed opacity-70' : 'bg-blue-600 hover:bg-blue-700'}`}
        >
          {loading ? 'Analyzing...' : 'Analyze Resume'}
        </button>

        {analysis && (
          <div className="mt-6 bg-gray-800 p-6 rounded-xl w-full border border-gray-700">
            <h2 className="text-xl font-semibold mb-3 text-blue-400">
              AI Resume Analysis
            </h2>

            <p className="mb-2"><b>Score:</b> {analysis.score}/100</p>

            <p className="mt-3 font-semibold text-green-400">Skills:</p>
            <ul className="list-disc ml-6">
              {analysis.skills?.map((skill, i) => (
                <li key={i}>{skill}</li>
              ))}
            </ul>

            <p className="mt-3 font-semibold text-blue-400">Strengths:</p>
            <ul className="list-disc ml-6">
              {analysis.strengths?.map((s, i) => (
                <li key={i}>{s}</li>
              ))}
            </ul>

            <p className="mt-3 font-semibold text-red-400">Improvements:</p>
            <ul className="list-disc ml-6">
              {analysis.improvements?.map((imp, i) => (
                <li key={i}>{imp}</li>
              ))}
            </ul>
          </div>
        )}

      </div>

    </div>
  );
}

export default Home;