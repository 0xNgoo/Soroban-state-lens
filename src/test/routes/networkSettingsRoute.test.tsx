import { beforeEach, describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { RouterProvider, createRouter } from '@tanstack/react-router'
import { routeTree } from '../../routeTree.gen'
import { resetStore } from '../../store/lensStore'

describe('Network settings route', () => {
  beforeEach(() => {
    resetStore()
    window.history.pushState({}, '', '/settings/network')
  })

  it('explains how to distinguish browser RPC connection failures', async () => {
    const router = createRouter({
      routeTree,
      context: {},
      defaultPreload: 'intent',
      scrollRestoration: true,
      defaultStructuralSharing: true,
      defaultPreloadStaleTime: 0,
    })
    render(<RouterProvider router={router} />)

    expect(
      await screen.findByRole('heading', {
        name: 'Browser RPC connection troubleshooting',
      }),
    ).toBeTruthy()
    expect(
      screen.getByText(/explicit CORS or blocked-preflight message/),
    ).toBeTruthy()
    expect(
      screen.getByText(/Offline, DNS, TLS, or connection-refused errors/),
    ).toBeTruthy()
    expect(
      screen.getByText(
        /A JSON-RPC error response means the browser reached the endpoint/,
      ),
    ).toBeTruthy()
  })
})
