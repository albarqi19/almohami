import { Mention } from '@tiptap/extension-mention';
import { ReactRenderer } from '@tiptap/react';
import tippy from 'tippy.js';
import type { Instance as TippyInstance } from 'tippy.js';
import VariableSuggestionList from './VariableSuggestionList';
import type { VariableSuggestionListRef } from './VariableSuggestionList';
import { CONTRACT_VARIABLES } from '../../hooks/useContractVariables';

// Extension للمتغيرات في محرر Tiptap
export const VariableMention = Mention.configure({
  HTMLAttributes: {
    class: 'contract-variable-mention',
    style:
      'background-color: #dbeafe; color: #1d4ed8; padding: 2px 6px; border-radius: 4px; font-family: monospace; font-size: 0.9em;',
  },
  renderLabel({ options, node }) {
    return `{{${node.attrs.id}}}`;
  },
  suggestion: {
    char: '{{',
    allowSpaces: false,
    startOfLine: false,

    items: ({ query }) => {
      const lowerQuery = query.toLowerCase();
      return CONTRACT_VARIABLES.filter(
        (item) =>
          item.key.toLowerCase().includes(lowerQuery) ||
          item.label.toLowerCase().includes(lowerQuery)
      ).slice(0, 10);
    },

    render: () => {
      let component: ReactRenderer<VariableSuggestionListRef>;
      let popup: TippyInstance[];

      return {
        onStart: (props) => {
          component = new ReactRenderer(VariableSuggestionList, {
            props,
            editor: props.editor,
          });

          if (!props.clientRect) {
            return;
          }

          popup = tippy('body', {
            getReferenceClientRect: props.clientRect as () => DOMRect,
            appendTo: () => document.body,
            content: component.element,
            showOnCreate: true,
            interactive: true,
            trigger: 'manual',
            placement: 'bottom-start',
            theme: 'light-border',
            animation: 'shift-away',
            maxWidth: 350,
          });
        },

        onUpdate(props) {
          component.updateProps(props);

          if (!props.clientRect) {
            return;
          }

          popup[0].setProps({
            getReferenceClientRect: props.clientRect as () => DOMRect,
          });
        },

        onKeyDown(props) {
          if (props.event.key === 'Escape') {
            popup[0].hide();
            return true;
          }

          return component.ref?.onKeyDown(props) ?? false;
        },

        onExit() {
          popup[0].destroy();
          component.destroy();
        },
      };
    },
  },
});

export default VariableMention;
