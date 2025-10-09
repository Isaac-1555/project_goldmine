# Feedback System - Testing Checklist

## Quick Setup for Testing

Before testing, make sure you've completed the setup in `FEEDBACK_SETUP.md`.

### Prerequisites Checklist

- [ ] Gmail App Password generated
- [ ] Supabase secrets set (GMAIL_USER, GMAIL_APP_PASSWORD, FEEDBACK_EMAIL)
- [ ] Edge Function deployed (`supabase functions deploy send-feedback`)
- [ ] `VITE_FEEDBACK_EMAIL` added to `.env` file
- [ ] App rebuilt/restarted (`npm run dev`)

## Testing Steps

### 1. Test UI Components

1. **Start the app:**
   ```bash
   npm run dev
   ```

2. **Navigate to Settings:**
   - Open the app in your browser
   - Go to the Settings tab
   - Scroll to the "Feedback & Support" section

3. **Verify UI elements:**
   - [ ] "Feedback & Support" section is visible
   - [ ] "Send Feedback" button is styled correctly
   - [ ] Button has MessageSquare icon

### 2. Test Modal Behavior

1. **Open modal:**
   - [ ] Click "Send Feedback" button
   - [ ] Modal appears with smooth animation
   - [ ] Modal has correct theme (light/dark)

2. **Test modal interactions:**
   - [ ] Close button (X) works
   - [ ] Clicking outside modal closes it
   - [ ] Keyboard focus is trapped in modal

### 3. Test Form Validation

1. **Empty submission:**
   - [ ] Click "Send Feedback" without entering text
   - [ ] Form shows validation error

2. **Valid submission:**
   - [ ] Select a category (e.g., "Bug Report")
   - [ ] Enter a message
   - [ ] Optionally enter email
   - [ ] Submit button enables when message is filled

### 4. Test Feedback Submission

1. **Successful submission:**
   ```
   Category: General Feedback
   Message: This is a test feedback from the app!
   Email: test@example.com (optional)
   ```
   - [ ] Loading spinner appears during submission
   - [ ] Success message shows: "Thank you! Your feedback has been sent."
   - [ ] Modal closes after 2 seconds
   - [ ] Check your email inbox for the feedback

2. **Email verification:**
   - [ ] Email arrives within 1-2 minutes
   - [ ] Subject: `[SummarEase Feedback] General Feedback`
   - [ ] Email contains category, message, and timestamp
   - [ ] User email is included (if provided)

### 5. Test Error Handling

1. **Simulate network error:**
   - Open browser DevTools > Network tab
   - Set to "Offline" mode
   - Try submitting feedback
   - [ ] Error message appears
   - [ ] User can retry after going back online

2. **Test with missing configuration:**
   - This will happen if Supabase secrets aren't set
   - [ ] Should show "Email service not configured" error

### 6. Test Different Categories

Submit feedback with each category and verify emails:

- [ ] General Feedback
- [ ] Bug Report
- [ ] Feature Request
- [ ] Question
- [ ] Other

### 7. Test Responsive Design

1. **Desktop (> 600px):**
   - [ ] Modal is centered and properly sized
   - [ ] Buttons are side-by-side

2. **Mobile (< 600px):**
   - [ ] Modal takes up 95% width
   - [ ] Buttons stack vertically
   - [ ] Form is easily fillable on small screens

### 8. Test Theme Switching

1. **Light theme:**
   - [ ] Modal background is light
   - [ ] Text is readable
   - [ ] Inputs have correct styling

2. **Dark theme:**
   - [ ] Modal background is dark
   - [ ] Text is readable
   - [ ] Success/error messages have proper contrast

## Monitoring & Debugging

### Check Function Logs

```bash
# View recent logs
supabase functions logs send-feedback

# Follow logs in real-time
supabase functions logs send-feedback --follow
```

### Common Issues

**Modal not appearing:**
- Check browser console for errors
- Verify FeedbackModal component is imported correctly

**"Email service not configured" error:**
```bash
# List current secrets
supabase secrets list

# Set missing secrets
supabase secrets set GMAIL_USER=your-email@gmail.com
supabase secrets set GMAIL_APP_PASSWORD=your-app-password
supabase secrets set FEEDBACK_EMAIL=your-email@gmail.com
```

**Email not received:**
1. Check spam folder
2. Verify Gmail App Password is correct
3. Check function logs for errors
4. Try sending a test with curl (see FEEDBACK_SETUP.md)

**CORS errors:**
- Ensure function is deployed: `supabase functions deploy send-feedback`
- Check Supabase project status in dashboard

## Performance Testing

### Load Test

Send multiple feedback submissions rapidly:
- [ ] All submissions process successfully
- [ ] No rate limiting issues (within free tier limits)
- [ ] All emails arrive

### Expected Performance

- **Submission time:** 2-5 seconds
- **Email delivery:** 1-2 minutes
- **Function cold start:** ~1-2 seconds (first invocation)
- **Function warm start:** <1 second

## Success Criteria

All of these should be true:

- ✅ UI looks professional and matches app theme
- ✅ Form validation works correctly
- ✅ Feedback submissions succeed
- ✅ Emails arrive with correct formatting
- ✅ Error handling works gracefully
- ✅ Mobile responsive design works
- ✅ Light/dark themes both look good
- ✅ No console errors or warnings

## Next Steps After Testing

1. **Add your actual email to `.env`:**
   ```bash
   VITE_FEEDBACK_EMAIL=your-actual-email@gmail.com
   ```

2. **Update Supabase secrets with your Gmail:**
   ```bash
   supabase secrets set GMAIL_USER=your-actual-email@gmail.com
   supabase secrets set GMAIL_APP_PASSWORD=your-app-password
   supabase secrets set FEEDBACK_EMAIL=your-actual-email@gmail.com
   ```

3. **Rebuild and deploy:**
   ```bash
   npm run build
   ```

4. **Monitor usage:**
   - Check Supabase dashboard for function invocations
   - Monitor email inbox for feedback

## Optional Enhancements

Consider adding these in the future:

- Rate limiting (prevent spam)
- File attachments for bug reports
- Feedback history page for users
- Auto-reply email confirmation
- Analytics/tracking for feedback categories
- Integration with issue tracker (GitHub, Jira, etc.)
