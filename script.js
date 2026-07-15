const START_DATE = new Date("2026-07-11");

// Normalize a date to midnight UTC to prevent timezone shifts from changing the word mid-day
function getUtcMidnight(date) {
    return Date.UTC(date.getFullYear(), date.getMonth(), date.getDate());
}

async function loadWord() {
    try {
        // 1. Load and parse the validated word list
        const response = await fetch("valid-words.txt");
        if (!response.ok) throw new Error("Failed to load valid-words.txt");
        
        const text = await response.text();
        const words = text
            .split("\n")
            .map(word => word.trim())
            .filter(Boolean);

        if (words.length === 0) {
            showError("No words found in the list.");
            return;
        }

        // 2. Calculate today's index safely
        const today = new Date();
        const msPerDay = 86400000;
        const days = Math.floor(
            (getUtcMidnight(today) - getUtcMidnight(START_DATE)) / msPerDay
        );
        
        // Use Math.max to handle cases where user's system clock is set before START_DATE
        const safeDays = Math.max(0, days);
        const word = words[safeDays % words.length];

        // 3. Fetch dictionary data
        const apiResponse = await fetch(
            `https://api.dictionaryapi.dev/api/v2/entries/en/${word}`
        );
        
        if (!apiResponse.ok) {
            throw new Error(`Word "${word}" not found in the dictionary API.`);
        }

        const data = await apiResponse.json();
        const entry = data[0];

        if (!entry) {
            throw new Error("Invalid API response structure.");
        }

        // 4. Update UI elements safely
        document.getElementById("word").textContent = entry.word || word;

        // Display phonetic spelling if available
        const phoneticObj = entry.phonetics?.find(p => p.text);
        const phoneticText = entry.phonetic || (phoneticObj ? phoneticObj.text : "");
        document.getElementById("phonetic").textContent = phoneticText;

        // Safely extract definition
        const definitionText = entry.meanings?.[0]?.definitions?.[0]?.definition;
        document.getElementById("definition").textContent = 
            definitionText || "Definition unavailable.";

        // Safely extract example sentence
        const exampleText = entry.meanings?.[0]?.definitions?.[0]?.example;
        document.getElementById("example").textContent = 
            exampleText || "No example available.";

        // Safely find and bind audio pronunciation
        const audioUrl = entry.phonetics?.find(p => p.audio && p.audio.trim() !== "")?.audio;

        if (audioUrl) {
            const button = document.getElementById("playAudio");
            button.hidden = false;
            button.onclick = () => {
                // Ensure protocol is present if the API returns a relative double-slash URL (e.g., //ssl.gstatic.com...)
                const absoluteUrl = audioUrl.startsWith("//") ? `https:${audioUrl}` : audioUrl;
                new Audio(absoluteUrl).play().catch(err => {
                    console.error("Audio playback failed:", err);
                });
            };
        } else {
            document.getElementById("playAudio").hidden = true;
        }

    } catch (error) {
        console.error(error);
        showError("Oops! Something went wrong loading today's word.");
    }
}

function showError(message) {
    document.getElementById("word").textContent = "Error";
    document.getElementById("definition").textContent = message;
    document.getElementById("phonetic").textContent = "";
    document.getElementById("example").textContent = "";
    document.getElementById("playAudio").hidden = true;
}

loadWord();