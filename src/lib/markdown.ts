import Markdoc from '@markdoc/markdoc';

const alignmentTag = {
  attributes: {
    position: {
      type: String,
      default: 'left',
      matches: ['left', 'center', 'right'],
      errorLevel: 'critical' as const,
    },
  },
  transform(node: any, config: any) {
    const attributes = node.transformAttributes(config);
    const position = ['left', 'center', 'right'].includes(attributes.position) ? attributes.position : 'left';
    return new Markdoc.Tag('div', { class: `article-align article-align-${position}` }, node.transformChildren(config));
  },
};

const indentTag = {
  transform(node: any, config: any) {
    return new Markdoc.Tag('div', { class: 'article-indent' }, node.transformChildren(config));
  },
};

const fontSizeTag = {
  attributes: {
    size: {
      type: String,
      default: '16',
      matches: ['14', '16', '18', '20', '24'],
      errorLevel: 'critical' as const,
    },
  },
  transform(node: any, config: any) {
    const attributes = node.transformAttributes(config);
    const size = ['14', '16', '18', '20', '24'].includes(attributes.size) ? attributes.size : '16';
    return new Markdoc.Tag('div', { class: `article-font-size article-font-size-${size}` }, node.transformChildren(config));
  },
};

export function renderMarkdown(content: string) {
  const ast = Markdoc.parse(content);
  const transformed = Markdoc.transform(ast, {
    nodes: {
      softbreak: { render: 'br' },
    },
    tags: {
      align: alignmentTag,
      indent: indentTag,
      fontsize: fontSizeTag,
    },
  });
  return Markdoc.renderers.html(transformed);
}
