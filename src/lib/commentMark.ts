import { Mark, mergeAttributes } from '@tiptap/core'

export const CommentMark = Mark.create({
  name: 'comment',

  addAttributes() {
    return {
      comment: {
        default: null,
        parseHTML: (el) => el.getAttribute('data-comment'),
        renderHTML: (attrs) => ({ 'data-comment': attrs.comment }),
      },
    }
  },

  parseHTML() {
    return [{ tag: 'span[data-comment]' }]
  },

  renderHTML({ HTMLAttributes }) {
    return [
      'span',
      mergeAttributes(HTMLAttributes, {
        class: 'annotation-highlight',
      }),
      0,
    ]
  },
})
