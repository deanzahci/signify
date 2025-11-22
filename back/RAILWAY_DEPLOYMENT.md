# Railway Deployment Guide - Signify Backend

## Prerequisites

- Railway account (https://railway.app)
- GitHub repository connected to Railway
- ONNX model file (8.6 MB) - `lstm_best_acc0.9946.onnx`
- Git LFS installed (for model file)

## Quick Deploy (5 minutes)

### Step 1: Connect Repository to Railway

1. Go to https://railway.app
2. Click **"New Project"**
3. Select **"Deploy from GitHub repo"**
4. Choose your repository: `signify`
5. Railway will auto-detect `railway.toml` configuration

### Step 2: Configure Environment

Railway will automatically set the following:
- `PORT` - WebSocket port (Railway manages this)
- `RAILWAY_ENVIRONMENT` - Set to "production"

**Optional Environment Variables** (set in Railway Dashboard):
- `LOG_LEVEL=INFO` - Logging verbosity
- `HEALTH_PORT=8080` - Health check endpoint port
- `MEDIAPIPE_MIN_DETECTION_CONFIDENCE=0.5` - Hand detection sensitivity
- `SLIDING_WINDOW_SIZE=5` - Smoothing window size

See `.env.example` for all available options.

### Step 3: Deploy

Railway will automatically:
1. **Build** Docker image from `back/Dockerfile` (~5-7 minutes first deploy)
2. **Pull** ONNX model from Git LFS
3. **Start** container with WebSocket server
4. **Expose** public URL for WebSocket connections

### Step 4: Verify Deployment

**Check Build Logs**:
```
[build] ✓ Requirements installed
[build] ✓ Application code copied  
[build] ✓ Image built successfully
```

**Check Runtime Logs**:
```
INFO - Loaded ONNX model from /app/models/lstm_best_acc0.9946.onnx
INFO - Input: input [1, 1, 21, 3]
INFO - Output: output [1, 26]
INFO - Health check endpoint available at http://0.0.0.0:8080/health
INFO - Starting WebSocket server on 0.0.0.0:[PORT]
INFO - Server listening on ws://0.0.0.0:[PORT]
```

**Test Health Endpoint**:
```bash
curl https://[your-railway-domain].railway.app/health
# Expected: {"status": "healthy", "service": "signify-backend", ...}
```

**Test WebSocket**:
```bash
# Connect from your client app
ws://[your-railway-domain].railway.app
```

---

## Architecture

### Railway Configuration (`railway.toml`)

```toml
[build]
builder = "DOCKERFILE"
dockerfilePath = "Dockerfile"

[deploy]
startCommand = "python main.py"
restartPolicyType = "ON_FAILURE"
restartPolicyMaxRetries = 10

[environments.production]
rootDirectory = "back"
```

**Key points**:
- `rootDirectory = "back"` - Railway sets context to `back/` directory
- `dockerfilePath` is relative to rootDirectory
- Docker build runs from project root with context in `back/`

### Dockerfile

Located at `back/Dockerfile`:
- Base: `python:3.11-slim`
- System deps: `libgl1`, `libglib2.0-0` (for MediaPipe/OpenCV)
- Python deps: `onnxruntime`, `mediapipe`, `opencv-python-headless`
- Exposes: Port 8765 (WebSocket)
- Health check: Port 8080 (HTTP)

### Model File Handling

The 8.6MB ONNX model is stored in Git LFS:
- Railway automatically pulls LFS files during build
- Model path: `/app/models/lstm_best_acc0.9946.onnx`
- Verified at startup (logs will show "Loaded ONNX model...")

---

## Monitoring & Health Checks

### Health Check Endpoint

Railway can monitor service health:
- **URL**: `http://[domain]/health`
- **Method**: GET
- **Response**: `{"status": "healthy", "service": "signify-backend", ...}`
- **Port**: 8080 (or `HEALTH_PORT` env var)

Configure in Railway Dashboard:
- Path: `/health`
- Port: 8080
- Interval: 30s
- Timeout: 10s

### Logs

View real-time logs in Railway Dashboard:
```bash
# Or via CLI
railway logs
```

**Key log patterns**:
- `"Loaded ONNX model"` - Model loaded successfully
- `"Client connected"` - WebSocket client connected
- `"Inference result"` - Predictions being made
- `"mock mode"` - ⚠️ ERROR: Model not found

### Metrics

Access via Railway Dashboard:
- CPU usage
- Memory usage (~200-300MB expected)
- Network traffic
- Restart count

---

## Performance Expectations

| Metric | Expected Value |
|--------|----------------|
| **Build Time** | 5-7 minutes (first build) |
| **Build Time** | 1-2 minutes (cached) |
| **Image Size** | ~700MB (without torch) |
| **Memory Usage** | 200-300MB at idle |
| **Memory Usage** | 400-500MB under load |
| **Cold Start** | 2-3 seconds |
| **Inference Latency** | 10-20ms per frame |
| **Total Latency** | 100-150ms (frame to result) |

---

## Troubleshooting

### Issue 1: Build Fails - "No module named 'onnxruntime'"

**Cause**: Missing dependency in requirements.txt

**Solution**: Verify `requirements.txt` contains:
```
onnxruntime>=1.16.0
```

### Issue 2: Model Not Found / Mock Mode

**Logs show**: `"Running in mock mode"` or `"ONNX model not found"`

**Cause**: Model file not in image

**Solutions**:
1. Verify Git LFS is set up:
   ```bash
   git lfs ls-files
   # Should show: back/models/lstm_best_acc0.9946.onnx
   ```

2. Check `.dockerignore` doesn't exclude `models/`:
   ```bash
   grep "models" back/.dockerignore
   # Should NOT have: models/ or *.onnx
   ```

3. Verify file exists in repo:
   ```bash
   ls -lh back/models/lstm_best_acc0.9946.onnx
   # Should show: 8.6M
   ```

### Issue 3: Container Exits Immediately

**Logs show**: Container starts then exits

**Common causes**:
1. **Import error**: Missing Python dependency
   - Check build logs for import errors
   - Verify all deps in `requirements.txt`

2. **Port already in use**: (Unlikely on Railway)
   - Railway manages ports automatically

3. **Startup crash**: Exception during initialization
   - Check logs for Python tracebacks
   - Test locally with Docker first

**Solution**: Review full logs and fix errors shown

### Issue 4: WebSocket Connection Refused

**Cause**: Incorrect URL or port

**Solution**:
- Use Railway-provided domain (not localhost)
- Use `wss://` (not `ws://`) for secure connections
- Verify PORT env var is set correctly

### Issue 5: High Memory Usage / OOM

**Logs show**: `"Out of memory"` or container restarts frequently

**Causes**:
- Memory leak in application
- Too many concurrent connections
- Large frame buffer accumulation

**Solutions**:
1. Monitor metrics in Railway dashboard
2. Increase Railway plan memory limit
3. Optimize buffer sizes in `config.py`:
   ```python
   KEYPOINT_BUFFER_SIZE = 16  # Reduce from 32
   SLIDING_WINDOW_SIZE = 3    # Reduce from 5
   ```

### Issue 6: Slow Inference

**Symptoms**: High latency (> 500ms per frame)

**Solutions**:
1. Check CPU usage (may need to upgrade plan)
2. Reduce MediaPipe complexity:
   ```python
   MEDIAPIPE_MODEL_COMPLEXITY = 0  # Faster, less accurate
   ```
3. Consider GPU-enabled Railway plan (if available)

---

## Scaling & Optimization

### Horizontal Scaling

Railway supports multiple instances:
- Enable in Dashboard under "Settings" → "Replicas"
- Use Railway's load balancer
- WebSocket connections are sticky

### Vertical Scaling

Upgrade Railway plan for:
- More CPU cores (faster inference)
- More memory (handle more connections)
- GPU support (future enhancement)

### Cost Optimization

**Reduce costs**:
1. Use Railway's free tier for development
2. Enable sleep mode for inactive services
3. Optimize image size (already done - removed torch)
4. Use CDN for static assets (if any)

**Current costs** (estimated):
- Starter plan: $5/month
- Hobby plan: $10/month
- Pro plan: Custom pricing

---

## Updating the Deployment

### Code Changes

```bash
# Make changes locally
git add .
git commit -m "feat: your changes"
git push origin main

# Railway auto-deploys on push to main
```

### Model Updates

```bash
# Update model file
cp new_model.onnx back/models/lstm_best_acc0.9946.onnx

# Commit via Git LFS
git add back/models/lstm_best_acc0.9946.onnx
git commit -m "Update ONNX model"
git push origin main

# Railway will rebuild with new model
```

### Environment Variables

Update in Railway Dashboard:
- Go to project settings
- Navigate to "Variables"
- Add/modify variables
- Service will auto-restart

---

## Rollback

If deployment fails:

### Via Railway Dashboard
1. Go to "Deployments"
2. Find previous successful deployment
3. Click "Redeploy"

### Via Git
```bash
# Revert to previous commit
git revert HEAD
git push origin main

# Or reset to specific commit
git reset --hard [commit-hash]
git push --force origin main
```

---

## Security Best Practices

1. **Environment Variables**:
   - Never commit `.env` files
   - Use Railway's encrypted variables
   - Rotate credentials regularly

2. **Dependencies**:
   - Keep requirements.txt up to date
   - Monitor for security vulnerabilities
   - Use `pip-audit` to scan

3. **Access Control**:
   - Limit Railway project access
   - Use Railway teams for collaboration
   - Enable 2FA on Railway account

4. **Network**:
   - Use WSS (secure WebSocket) in production
   - Implement rate limiting (if needed)
   - Monitor for unusual traffic

---

## Support & Resources

**Railway Documentation**:
- Deployments: https://docs.railway.app/deploy/deployments
- Environment Variables: https://docs.railway.app/deploy/variables
- Docker: https://docs.railway.app/deploy/dockerfiles

**Signify Documentation**:
- ONNX Integration: `ONNX_MIGRATION_SUMMARY.md`
- Architecture: `docs/ONNX_ARCHITECTURE.md`
- Quick Start: `QUICKSTART_ONNX.md`

**Getting Help**:
- Railway Discord: https://discord.gg/railway
- GitHub Issues: [your-repo]/issues
- Railway Support: support@railway.app

---

## Deployment Checklist

Before deploying to Railway:

- [ ] Git LFS configured and model file tracked
- [ ] `railway.toml` reviewed and correct
- [ ] `Dockerfile` tested locally
- [ ] `requirements.txt` has all dependencies
- [ ] `.dockerignore` optimized
- [ ] Environment variables documented
- [ ] Health check endpoint working
- [ ] All changes committed to git
- [ ] Pushed to GitHub main branch
- [ ] Railway project created and connected
- [ ] Build logs monitored (no errors)
- [ ] Runtime logs show "Loaded ONNX model"
- [ ] Health endpoint returns 200 OK
- [ ] WebSocket connection successful
- [ ] Inference working correctly

---

**Version**: 1.0.0  
**Last Updated**: November 22, 2025  
**Status**: ✅ Production Ready
