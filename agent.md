# Agent Configuration

## Environment
- Operating System: macOS Sequoia
- Shell: zsh
- Node Version Manager: nvm
- Package Manager: npm

## Command Formatting
- Do not use comments for terminal commands
- Do not use bash-specific syntax
- Ensure commands are compatible with zsh
- Run all terminal commands as background processes so
  you have a prompt back before the command finishes
  and you have access to its output.

## Project Structure
- Root directory: /Users/calemcnulty/Workspaces/tokzic
- Documentation lives alongside code in root directory
- Assets in /assets
- Source code in /src
  - No assets in src directory
  - Components, screens, and business logic in src

## Development Rules
- All commands should be tested against zsh compatibility
- Use npx for running local project tools
- Prefer explicit commands over aliases
- Include error handling suggestions where appropriate
- Package Installation Guidelines:
  - Use `npx expo install` for:
    - Packages with native code components
    - React Native specific packages
    - Packages commonly used in Expo ecosystem
  - Use `npm install --save` or `npm install --save-dev` for:
    - Pure JavaScript packages
    - Packages without native dependencies
    - Packages not requiring Expo configuration
  - Always include --save or --save-dev flag with npm install
- Device Communication:
  - Always use USB connection for device communication
  - Never use WiFi or network-based debugging
  - Ensure USB debugging is enabled on Android devices
  - Use `adb reverse` for port forwarding
  - Verify device connection with `adb devices` before starting development
- Logging and Error Handling:
  - Implement comprehensive logging for:
    - Execution flow (entry/exit of significant functions)
    - State transitions (Redux actions and state changes)
    - Data flow (API calls, responses, transformations)
    - Error conditions with full stack traces and context
  - Build defensively:
    - Validate all inputs at system boundaries
    - Use TypeScript to enforce type safety
    - Handle all possible error conditions explicitly
    - Never assume external data is correctly formatted
    - Add runtime checks for critical assumptions
  - Error handling practices:
    - Log errors with sufficient context for debugging
    - Provide meaningful error messages for users
    - Implement graceful fallbacks where possible
    - Structure errors to make debugging efficient
    - Track error frequency and patterns

## Communication
- Provide clear step-by-step instructions
- Separate commands from explanatory text
- Flag any OS or shell-specific considerations

## Request Validation
- Always validate user requests against best practices and project requirements
- If a user's request would lead to suboptimal or incorrect solutions:
  - Explain why their approach may not be ideal
  - Propose better alternatives with clear reasoning
  - Only proceed with implementation after alignment on the right approach
- Prioritize writing correct, maintainable code over following incorrect instructions
- Be direct and professional when suggesting better approaches

## Workflow Management
- Follow a strict epic-driven development process:
  1. Epic Creation
     - Each epic should have a clear, measurable goal
     - Create epic documentation in /epics directory
     - Include success criteria and constraints
  
  2. Task Breakdown
     - Break epic into discrete, manageable tasks
     - Document tasks in epic's markdown file
     - Include acceptance criteria for each task
     - Estimate complexity/dependencies
  
  3. Task Execution
     - Work on one task at a time
     - Follow task order based on dependencies
     - Document any blockers or issues
     - Never move to next task until current is complete
     - Update all relevant documentation BEFORE moving to next task
     - Ensure documentation reflects current state and correct shell syntax
  
  4. Progress Tracking
     - Update task status after each step (✓ for complete)
     - Document any deviations from original plan
     - Update task list if new requirements emerge
     - Keep epic documentation current
     - Review and update related documentation for accuracy

- Before each action, verify:
  - Which epic we're working on
  - Which task we're executing
  - Current progress status
  - Next steps in sequence
  - All documentation is up to date and accurate

# Development Environment

## Expo Development Server
- Expo will always be run in a terminal tab and shared with the composer
- This ensures consistent access to the development server across composer instances
- The terminal output will be available in the composer's context
- Do not attempt to run the development server yourself.

