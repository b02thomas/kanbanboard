# SMB Startup Kanban Board & AI Assistant Setup Guide

## 🎯 Overview

Your SMB Startup Kanban Board now includes an integrated AI Assistant that connects to n8n workflows. This guide will help you set up the n8n integration for production use.

## 🔧 Current Implementation Status

### ✅ What's Working Now:
- Complete SMB Startup Kanban Board
- AI Chatbot Interface (bottom-right corner)
- Mock AI responses for testing
- User-specific chat history
- Project management and analytics
- 5 demo user accounts

### 🔄 What Needs n8n Configuration:
- Real AI responses from your n8n workflow
- Custom AI behavior and integrations
- Advanced context understanding

## 📋 Demo Accounts

```
👨‍💼 Admin: admin / admin123
👨‍💻 Developer: developer / dev123
👩‍🎨 Designer: designer / design123
👩‍💼 Manager: manager / manager123
👨‍💰 Sales: sales / sales123
```

## 🚀 N8N Integration Setup

### Step 1: Create N8N Workflow

1. **Open your n8n instance**
2. **Create a new workflow**
3. **Add a Webhook node** with these settings:
   - **HTTP Method**: POST
   - **Path**: `/webhook/chatbot`
   - **Response Mode**: Respond to Webhook

### Step 2: Configure Webhook Response

Your n8n workflow should expect this JSON payload:

```json
{
  "message": "User's message text",
  "user": {
    "id": "user_id",
    "name": "User Full Name",
    "role": "user_role",
    "avatar": "👤"
  },
  "timestamp": "2025-01-01T12:00:00Z",
  "context": "kanban_board"
}
```

### Step 3: Sample N8N Workflow Structure

```
Webhook Trigger → AI Processing → Response Formatter → Webhook Response
```

**Example response format:**
```json
{
  "response": "I can help you with your tasks! Based on your kanban board, I see you have several items in progress. Would you like me to help prioritize them?"
}
```

### Step 4: Environment Configuration

Update your backend environment variables:

```bash
# In /app/backend/.env
N8N_WEBHOOK_URL=https://your-n8n-instance.com/webhook/chatbot
N8N_API_KEY=your-api-key-here
```

### Step 5: Advanced N8N Workflow Ideas

#### AI Context Enhancement
```
Webhook → Get User Tasks → Get Projects → AI Analysis → Intelligent Response
```

#### Task Management Assistant
```
Webhook → Parse Intent → Task Actions → Update Database → Confirmation Response
```

#### Project Insights
```
Webhook → Analytics Query → AI Interpretation → Actionable Insights → Response
```

## 🛠️ How to Add More Users

### Backend Configuration

Edit `/app/backend/server.py` and add to the `USERS` dictionary:

```python
"newuser": {
    "id": "newuser",
    "username": "newuser",
    "email": "newuser@smb.startup",
    "full_name": "New User Name",
    "hashed_password": pwd_context.hash("password123"),
    "avatar": "👤",  # Choose an emoji
    "role": "role_name"
}
```

### Frontend Updates

The user list is automatically fetched from the backend, so new users will appear in:
- Login form demo accounts
- Task assignment dropdowns
- User management interfaces

## 🎨 Customization Options

### 1. Change Company Branding

Edit the branding in `/app/frontend/src/App.js`:

```jsx
// Login form
<h1 className="text-3xl font-bold text-white mb-2">Your Company Name</h1>
<p className="text-gray-400">Your Subtitle</p>

// Header
<div className="text-2xl font-bold text-white">Your Company Name</div>
<div className="text-gray-300">Your System Name</div>
```

### 2. Customize AI Assistant

Edit the AI assistant configuration in `/app/backend/server.py`:

```python
# Customize mock response
async def call_n8n_workflow(message: str, user_context: dict) -> str:
    if N8N_WEBHOOK_URL == 'https://your-n8n-instance.com/webhook/chatbot':
        return f"Your Custom AI: I'm here to help with your question: '{message}'"
```

### 3. Add Custom Project Colors

Edit `/app/frontend/src/App.js`:

```jsx
const projectColors = {
  // Add your custom colors
  mint: "bg-mint-500",
  coral: "bg-coral-500",
  // ... existing colors
};
```

## 🔍 Testing Your Setup

### 1. Test Chatbot Interface
1. Login with any demo account
2. Click the blue chat button (bottom-right)
3. Send a test message
4. Verify you get a response

### 2. Test N8N Integration
1. Configure your n8n webhook URL
2. Restart the backend server
3. Send a chat message
4. Check if you get responses from your n8n workflow

### 3. Test Multi-User Chat
1. Login as different users
2. Verify each user has separate chat history
3. Test that messages don't leak between users

## 🐛 Troubleshooting

### Common Issues:

1. **Chatbot button not clickable**
   - Fixed in latest version with z-index improvements

2. **N8N not responding**
   - Check webhook URL configuration
   - Verify n8n workflow is active
   - Check network connectivity

3. **Chat messages not saving**
   - Verify MongoDB connection
   - Check user authentication
   - Review backend logs

### Backend Logs:
```bash
tail -f /var/log/supervisor/backend.*.log
```

### Frontend Logs:
Check browser console for errors

## 🚀 Production Deployment

### 1. Security Considerations
- Change default passwords
- Use environment variables for sensitive data
- Enable HTTPS for n8n webhook
- Set up proper CORS policies

### 2. Performance Optimization
- Configure MongoDB indexes
- Set up caching for frequent queries
- Optimize n8n workflow response times

### 3. Monitoring
- Set up logging for chat interactions
- Monitor n8n webhook response times
- Track user engagement metrics

## 📚 Advanced Features

### Future Enhancements:
1. **Voice Chat**: Add speech-to-text integration
2. **File Sharing**: Allow file uploads in chat
3. **Team Chat**: Add team-wide chat rooms
4. **AI Automations**: Trigger task actions via chat
5. **Analytics Dashboard**: Chat usage metrics

## 🤝 Support

For technical support or questions:
1. Check the troubleshooting section
2. Review backend/frontend logs
3. Test with mock responses first
4. Verify n8n workflow configuration

---

Your SMB Startup Kanban Board with AI Assistant is now ready for production use! 🎉