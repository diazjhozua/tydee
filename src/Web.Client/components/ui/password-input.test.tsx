import { createRef, type ComponentProps, type FormEvent } from "react"

import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"

import { Label } from "@/components/ui/label"
import { PasswordInput } from "@/components/ui/password-input"

function PasswordField(props: ComponentProps<typeof PasswordInput>) {
  return (
    <>
      <Label htmlFor="password">Password</Label>
      <PasswordInput id="password" {...props} />
    </>
  )
}

describe("PasswordInput", () => {
  it("renders masked and keeps the label as the accessible name", () => {
    render(<PasswordField />)

    const input = screen.getByLabelText("Password", { exact: true })

    expect(input).toHaveAttribute("type", "password")
    expect(input).toHaveValue("")
    expect(input).toHaveAccessibleName("Password")
  })

  it("toggles the type, value, and control state both ways", async () => {
    const user = userEvent.setup()
    render(<PasswordField defaultValue="hunter2" />)

    const input = screen.getByLabelText("Password", { exact: true })
    const show = screen.getByRole("button", { name: "Show password" })
    expect(show).toHaveAttribute("aria-pressed", "false")

    await user.click(show)

    expect(input).toHaveAttribute("type", "text")
    expect(input).toHaveValue("hunter2")
    const hide = screen.getByRole("button", { name: "Hide password" })
    expect(hide).toHaveAttribute("aria-pressed", "true")

    await user.click(hide)

    expect(input).toHaveAttribute("type", "password")
    expect(screen.getByRole("button", { name: "Show password" })).toHaveAttribute(
      "aria-pressed",
      "false",
    )
  })

  it("keeps visibility independent per field", async () => {
    const user = userEvent.setup()
    render(
      <>
        <Label htmlFor="password">Password</Label>
        <PasswordInput id="password" />
        <Label htmlFor="confirmPassword">Confirm password</Label>
        <PasswordInput id="confirmPassword" />
      </>,
    )

    await user.click(screen.getAllByRole("button", { name: "Show password" })[0])

    expect(screen.getByLabelText("Password", { exact: true })).toHaveAttribute("type", "text")
    expect(screen.getByLabelText("Confirm password")).toHaveAttribute("type", "password")
  })

  it("forwards input props, className, and the ref", () => {
    const ref = createRef<HTMLInputElement>()

    render(
      <PasswordField
        ref={ref}
        name="password"
        autoComplete="current-password"
        className="custom-class"
      />,
    )

    const input = screen.getByLabelText("Password", { exact: true })

    expect(input).toHaveAttribute("name", "password")
    expect(input).toHaveAttribute("autocomplete", "current-password")
    expect(input).toHaveClass("pr-10")
    expect(input).toHaveClass("custom-class")
    expect(ref.current).toBe(input)
  })

  it("passes validation attributes through", () => {
    render(
      <>
        <Label htmlFor="password">Password</Label>
        <PasswordInput id="password" aria-invalid aria-describedby="password-error" />
        <p id="password-error">Password is required</p>
      </>,
    )

    const input = screen.getByLabelText("Password", { exact: true })

    expect(input).toHaveAttribute("aria-invalid", "true")
    expect(input).toHaveAttribute("aria-describedby", "password-error")
  })

  it("names the toggle after the field and points it at the input", () => {
    render(
      <>
        <Label htmlFor="confirm-password">Confirm password</Label>
        <PasswordInput id="confirm-password" toggleLabel="confirm password" />
      </>,
    )

    const toggle = screen.getByRole("button", { name: "Show confirm password" })

    expect(toggle).toHaveAttribute("aria-controls", "confirm-password")
  })

  it("is reachable and toggles from the keyboard", async () => {
    const user = userEvent.setup()
    render(<PasswordField />)

    await user.tab()
    expect(screen.getByLabelText("Password", { exact: true })).toHaveFocus()

    await user.tab()
    expect(screen.getByRole("button", { name: "Show password" })).toHaveFocus()

    await user.keyboard("{Enter}")

    expect(screen.getByLabelText("Password", { exact: true })).toHaveAttribute("type", "text")
  })

  it("does not submit the surrounding form", async () => {
    const user = userEvent.setup()
    const onSubmit = vi.fn((event: FormEvent<HTMLFormElement>) => event.preventDefault())

    render(
      <form onSubmit={onSubmit}>
        <PasswordField />
      </form>,
    )

    await user.click(screen.getByRole("button", { name: "Show password" }))

    expect(onSubmit).not.toHaveBeenCalled()
  })

  it("disables the toggle with the input", () => {
    render(<PasswordField disabled />)

    expect(screen.getByLabelText("Password", { exact: true })).toBeDisabled()
    expect(screen.getByRole("button", { name: "Show password" })).toBeDisabled()
  })
})
