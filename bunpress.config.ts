import type { BunpressConfig } from 'bunpress'

const config: BunpressConfig = {
  name: 'pngx',
  description: 'Performant TypeScript PNG encoder & decoder',
  url: 'https://pngx.sh',

  head: [
    ['link', { rel: 'icon', type: 'image/svg+xml', href: '/logo.svg' }],
    ['meta', { name: 'keywords', content: 'png, encoder, decoder, typescript, bun, image-processing' }],
  ],

  themeConfig: {
    logo: '/logo.svg',

    nav: [
      { text: 'Docs', link: '/intro' },
      { text: 'GitHub', link: 'https://github.com/stacksjs/pngx' },
    ],

    sidebar: [
      {
        text: 'Get Started',
        items: [
          { text: 'Introduction', link: '/intro' },
          { text: 'Installation', link: '/install' },
          { text: 'Usage', link: '/usage' },
          { text: 'Configuration', link: '/config' },
        ],
      },
      {
        text: 'Features',
        items: [
          { text: 'PNG Encoding', link: '/features/png-encoding' },
          { text: 'PNG Decoding', link: '/features/png-decoding' },
          { text: 'Compression Levels', link: '/features/compression-levels' },
          { text: 'Metadata Handling', link: '/features/metadata-handling' },
        ],
      },
      {
        text: 'Advanced',
        items: [
          { text: 'Configuration', link: '/advanced/configuration' },
          { text: 'Custom Profiles', link: '/advanced/custom-profiles' },
          { text: 'Performance', link: '/advanced/performance' },
          { text: 'CI/CD Integration', link: '/advanced/ci-cd-integration' },
        ],
      },
    ],

    socialLinks: [
      { icon: 'github', link: 'https://github.com/stacksjs/pngx' },
    ],
  },
}

export default config
