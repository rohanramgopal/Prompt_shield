# 🛡️ PromptShield

PromptShield is a local security extension and token deflation gateway that stops API keys, database credentials, passwords, and PII (personally identifiable information) from leaving your local machine when interacting with LLMs and chat interfaces.

Built with **Zero Retention Architecture**, PromptShield processes all prompts and text transformations strictly client-side.

---

## 🌟 Key Features

### 1. Zero-Day Shannon Entropy Scanner
Unlike basic keyword-matching tools, PromptShield calculates character randomness dynamically using Shannon's information theory:
$$H(X) = -\sum P(x_i) \log_2 P(x_i)$$
Any high-entropy text string exceeding mathematical thresholds (length $\ge 16$, entropy $H \ge 4.3$) gets instantly flagged and neutralized. This intercepts database credentials, password hashes, and custom keys that traditional regex fails to detect.

### 2. Token Dehydration & local RAM Rehydration
- **Dehydrate**: Replaces detected secrets inside your prompt with dynamic cryptographic salt tokens (e.g. `[SI:a1f93d48]`) before network transmission.
- **RAM Registry**: Retains the matching key pairs inside the local memory (RAM) sandbox only.
- **Rehydrate**: Once the LLM server returns a reply, PromptShield automatically swaps the raw keys back into the text block locally so they are fully usable, ensuring third-party servers never receive your production secrets.

### 3. Chrome Paste-Interception Modal
Listens globally for paste actions on web platforms. If secrets are caught in the clipboard buffer:
1. Prevents default paste action.
2. Injects a gorgeous overlay popup showing the detected secrets categorized by type, line numbers, and character lengths.
3. Offers three actions:
   - **CANCEL**: Wipes the modal, canceling the paste.
   - **PASTE ANYWAY**: Pastes the raw text with original secrets intact.
   - **PASTE ANONYMOUSLY**: Pastes the sanitized text (containing salted placeholders) and syncs counts to your toolbar.

### 4. Advanced Token Deflation (99% Compression Mode)
Minimize input token costs with three granular strength modes:
- **Standard**: Trims double spaces, empty lines, and excessive punctuation.
- **Advanced**: Filters conversational greeting headers (e.g. `hi`, `could you please`, `greetings`) and filler words.
- **Ultra 99%**: Performs aggressive technical abbreviation maps and vowel-stripping, compression that preserves LLM reasoning while saving up to 99% of prompt storage payloads.

### 5. Indian Rupee (₹) Cost Comparison Matrix
- Tracks input/output costs for all major providers (OpenAI, Anthropic, Gemini, DeepSeek, and Groq).
- Converts pricing models to **Indian Rupees (INR)**.
- Compares original vs. optimized prompt run cost side-by-side.

---

## 📂 Project Architecture

```
.
├── public/
│   ├── manifest.json       # Manifest V3 Extension settings
│   ├── background.js       # Background service worker (Sidepanel toggle)
│   ├── content.js          # Clipboard paste listener and overlay generator
│   ├── content.css         # Styling for the paste warnings popup
│   ├── popup.html          # Toolbar popup dashboard HTML
│   └── popup.js            # Toolbar statistics manager
├── src/
│   ├── App.jsx             # PromptShield Interactive Console Dashboard
│   ├── index.css           # Premium responsive styles
│   └── utils/
│       ├── security.js     # Shannon entropy and regex detectors
│       ├── optimizer.js    # Compression algorithms
│       └── pricing.js      # Indian Rupee token rate card matrices
```

---

## 🚀 Installation & Setup

### Running the App Locally
1. Clone the repository and navigate to the project directory:
   ```bash
   cd "TOKEN MIN"
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Run the Vite development server:
   ```bash
   npm run dev
   ```
4. Access the dashboard UI at `http://localhost:5173/`.

### Loading the Chrome Extension
1. Build the production files:
   ```bash
   npm run build
   ```
2. Open Google Chrome and go to `chrome://extensions/`.
3. Toggle **Developer Mode** on (top right).
4. Click **Load unpacked** (top left).
5. Select the `dist/` directory generated in the root of the workspace.
6. *Alternative*: Extract `promptshield-extension.zip` from the project root and load that folder.
7. Click the extension icon in your Chrome toolbar to open the stats popup, or trigger the sidepanel!

---

## 🔒 Security Policies
- **No Telemetry**: PromptShield does not collect telemetry, analytics, or logging.
- **Zero Server Footprint**: 100% of execution runs inside Chrome's memory context.
- **Public Audits**: PromptShield's code is plain, readable, and publicly auditable.
