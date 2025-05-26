import { Meta, StoryObj, moduleMetadata } from '@storybook/angular';
import { CommonModule } from '@angular/common';
import { LogoComponent } from './logo.component';
 
const meta: Meta<LogoComponent> = {
  title: 'Components/Logo',
  component: LogoComponent,
  tags: ['autodocs'],
  decorators: [
    moduleMetadata({
      imports: [CommonModule],
    }),
  ],
  argTypes: {
    src: {
      control: 'text',
      description: 'Source URL for the logo image',
    },
    alt: {
      control: 'text',
      description: 'Alt text for the logo image',
    }
  }
};

export default meta;
type Story = StoryObj<LogoComponent>;

export const WithText: Story = {
  args: {
    src: 'assets/images/ced-logo.svg',
    alt: 'Company Logo',
  },
};

export const ImageOnly: Story = {
  args: {
    src: 'assets/images/ced-logo.svg',
    alt: 'Company Logo',
  },
};

export const LargeLogo: Story = {
  args: {
    src: 'assets/images/ced-logo.svg',
    alt: 'Company Logo',
  },
};