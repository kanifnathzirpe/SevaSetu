# SevaSetu Frontend

This is the frontend application for **SevaSetu**, a digital public health platform built with Next.js 15, React 19, and TypeScript.

## Overview

The frontend provides responsive web interfaces for multiple healthcare stakeholders:

- **Patient Portal**: Symptom triage, appointments, family health management, teleconsultation
- **ASHA Worker Portal**: Household surveys, visit planning, immunisation tracking
- **Doctor Portal**: OPD queue management, digital prescriptions, video consultations
- **Admin & DHO Dashboard**: District analytics, facility management, disease surveillance
- **Emergency Response**: 108 SOS dispatch and ambulance coordination

## Technology Stack

- **Framework**: Next.js 15 (App Router)
- **UI Library**: React 19
- **Styling**: TailwindCSS v4
- **Components**: Radix UI Primitives
- **State Management**: TanStack Query, React Hook Form
- **Icons**: Lucide React
- **Charts**: Recharts
- **Maps**: Leaflet / React-Leaflet
- **Real-time**: Socket.IO Client
- **Notifications**: Sonner
- **Animations**: Framer Motion

## Getting Started

### Prerequisites

- Node.js v20.x or later
- npm, yarn, pnpm, or bun

### Installation

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Start production server
npm start
```

The application will be available at [http://localhost:3000](http://localhost:3000)

## Project Structure

```
src/
├── app/                      # Next.js App Router pages
│   ├── (auth)/               # Login & Registration
│   ├── admin/                # Admin & DHO dashboards
│   ├── asha/                 # ASHA worker portal
│   ├── chat/                 # Messaging interface
│   ├── doctor/               # Doctor portal
│   ├── emergency/            # Emergency response
│   ├── patient/              # Patient portal & family management
│   └── video/                # WebRTC consultation
├── components/               # Reusable UI components
│   ├── layout/               # Layout components (sidebar, header, etc.)
│   ├── ui/                   # Base UI components
│   └── ...                   # Feature-specific components
├── lib/                      # Utilities and configurations
│   ├── api.ts                # API client
│   ├── auth.ts               # Authentication context
│   ├── i18n.tsx              # Internationalization
│   └── utils.ts              # Helper functions
└── styles/                   # Global styles
```

## Environment Variables

Create a `.env.local` file in the root directory:

```env
NEXT_PUBLIC_API_URL=http://localhost:8000
```

## Key Features

### Responsive Design
- Mobile-first approach with TailwindCSS
- Optimized for both desktop and mobile devices
- Touch-friendly interfaces for field workers

### Real-time Features
- WebRTC video consultations
- Socket.IO for real-time messaging
- Live dashboard updates

### Accessibility
- WCAG compliant color contrasts
- Keyboard navigation support
- Screen reader friendly components

## Deployment

The frontend can be deployed to various platforms:

- **Vercel**: Recommended for Next.js applications
- **Docker**: Containerized deployment (see main README)
- **Netlify**: Alternative deployment option

For production deployment, ensure the `NEXT_PUBLIC_API_URL` environment variable points to your production backend API.

## Development Notes

- The app uses Next.js App Router for routing
- Server components are used where possible for performance
- Client components are used for interactive features
- TypeScript is used throughout for type safety
