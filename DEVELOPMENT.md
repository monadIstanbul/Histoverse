# Development Guidelines & Troubleshooting

## Common Development Issues

### DOM Nesting Warnings
If you see warnings like "validateDOMNesting(...): <html> cannot appear as a child of <#fragment>":
- This is typically caused by browser extensions (React DevTools, other dev extensions)
- The app automatically suppresses these warnings in development mode
- These warnings don't affect functionality and are safe to ignore

### WebSocket Connection Errors
Connection errors to `ws://localhost:8081/` or similar:
- These come from browser extensions trying to connect to their local servers
- Not related to your Vite development server
- Automatically suppressed in the console

### Development Server Issues
If the development server is acting up:
```bash
# Kill any existing servers
npm run dev:clean

# Restart with fresh cache
npm run dev
```

## Browser Extensions
For the best development experience:
1. **React DevTools**: Install from https://reactjs.org/link/react-devtools
2. **MetaMask**: Required for blockchain functionality
3. Consider disabling other extensions during development if they cause conflicts

## Error Handling
- The app includes an ErrorBoundary component for graceful error handling
- Development errors show detailed information
- Production errors show user-friendly messages

## Performance Tips
- Use `npm run dev:host` to test on other devices on your network
- Use `npm run type-check` to verify TypeScript without building
- Source maps are enabled for better debugging