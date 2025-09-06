// Configuration helper script
// Run this to check your configuration and get setup instructions

const fs = require('fs');
const path = require('path');

console.log('🏥 Antler GP Surgery - Configuration Helper\n');
console.log('============================================\n');

// Check if .env file exists
const envPath = path.join(__dirname, '.env');
const envExists = fs.existsSync(envPath);

if (!envExists) {
    console.log('❌ .env file not found!\n');
    console.log('Creating .env file with template...\n');
    
    const envTemplate = `# Synthflow Configuration
SYNTHFLOW_API_KEY=your_synthflow_api_key_here
SYNTHFLOW_ASSISTANT_ID=your_assistant_id_here

# Deepgram Configuration
DEEPGRAM_API_KEY=your_deepgram_api_key_here

# Server Configuration
PORT=3000
NODE_ENV=development`;

    fs.writeFileSync(envPath, envTemplate);
    console.log('✅ .env file created!\n');
} else {
    console.log('✅ .env file found\n');
}

// Load environment variables
require('dotenv').config();

// Check configuration
console.log('Configuration Status:\n');
console.log('--------------------\n');

const configs = [
    {
        name: 'Synthflow API Key',
        value: process.env.SYNTHFLOW_API_KEY,
        instructions: `
To get your Synthflow API key:
1. Go to https://synthflow.ai
2. Sign up or log in to your account
3. Navigate to Settings > API Keys
4. Generate a new API key
5. Copy and paste it into .env file`
    },
    {
        name: 'Synthflow Assistant ID',
        value: process.env.SYNTHFLOW_ASSISTANT_ID,
        instructions: `
To get your Assistant ID:
1. In Synthflow dashboard, create a new agent
2. Select "Widget" as the agent type
3. Configure your agent with GP receptionist prompts
4. Copy the Assistant ID from the agent details
5. Add it to your .env file`
    },
    {
        name: 'Deepgram API Key',
        value: process.env.DEEPGRAM_API_KEY,
        instructions: `
To get your Deepgram API key:
1. Go to https://deepgram.com
2. Sign up for a free account
3. Navigate to the API Keys section
4. Create a new API key
5. Copy and paste it into .env file`
    }
];

let allConfigured = true;

configs.forEach(config => {
    if (config.value && config.value !== `your_${config.name.toLowerCase().replace(/ /g, '_')}_here`) {
        console.log(`✅ ${config.name}: Configured`);
    } else {
        console.log(`❌ ${config.name}: Not configured`);
        console.log(config.instructions);
        allConfigured = false;
    }
    console.log('');
});

console.log('============================================\n');

if (allConfigured) {
    console.log('🎉 All configurations are set!\n');
    console.log('You can now start the server with: npm start\n');
    console.log('The application will be available at:');
    console.log(`- Main website: http://localhost:${process.env.PORT || 3000}`);
    console.log('- Downstream WebSocket: ws://localhost:8080\n');
} else {
    console.log('⚠️  Please configure the missing items in your .env file\n');
    console.log('After configuration, run this script again to verify.\n');
}

console.log('Quick Start Commands:');
console.log('--------------------');
console.log('npm start         - Start the server');
console.log('npm run dev       - Start with auto-reload (requires nodemon)');
console.log('node config-helper.js - Run this configuration helper\n');
