import type { Meta, StoryObj } from "@storybook/angular"
import { HeaderComponent } from "./header.component"
import { moduleMetadata } from "@storybook/angular"
import { CommonModule } from "@angular/common"
import { LogoComponent } from "../../atoms/logo/logo.component"


const meta: Meta<HeaderComponent> = {
  title: "Molecules/Header",
  component: HeaderComponent,
  tags: ["autodocs"],
  decorators: [
    moduleMetadata({
      imports: [CommonModule, LogoComponent],
    }),
  ],

  parameters: {
    layout: "fullscreen",
  },
 
  argTypes: {
    logoSrc: {
      control: "text",
      description: "Source URL for the logo image",
    },
    isDropdownOpen: {
      control: "boolean",
      description: "Whether the user dropdown is open",
    },
    toggleDropdown: { action: "toggleDropdown" },
    onSettingsClick: { action: "settings clicked" },
    onLogoutClick: { action: "logout clicked" },
  },
}

export default meta
type Story = StoryObj<HeaderComponent>

export const Default: Story = {
  args: {
    logoSrc: "assets/images/ced-logo.svg",
    isDropdownOpen: false,
  },
}

export const WithDropdownOpen: Story = {
  args: {
    logoSrc: "assets/images/ced-logo.svg",
    isDropdownOpen: true,
  },
}

export const CustomLogo: Story = {
  args: {
    logoSrc: "assets/images/alternate-logo.svg",
    isDropdownOpen: false,
  },
}
