const React = require('react');
const ReactDOM = require('react-dom');

const mixin = require('react-component-specs/lib/mixin-react-component');
const DescendantsWalkable = require('react-component-specs/lib/specs/lib/DescendantsWalkable');

const Validator = require('./Validator');

class Form extends mixin(DescendantsWalkable) {
	static displayName = 'Form';
	static propTypes = {
		onPreSubmit: React.PropTypes.func,
		onSubmit: React.PropTypes.func.isRequired,
		onPostSubmit: React.PropTypes.func
	};
	static Validator = Validator;

	onSubmit(event) {
		event.stopPropagation();
		event.preventDefault();

		if (typeof this.props.onPreSubmit === 'function') {
			this.props.onPreSubmit(event);
		}

		const validationTasks = [];
		const submitData = {};
		const form = ReactDOM.findDOMNode(this);

		this.walkDescendants((_, descendant, path, next) => {
			if (descendant instanceof Validator) {
				validationTasks.push(() => Validator.validate());
			} else {
				const domNode = ReactDOM.findDOMNode(descendant);
				Object.assign(submitData, fetchFieldValuePair(domNode));
			}

			next();
		});

		//if (Object.keys(submitData).length === 0) return;

		event.persist();

		Promise.all(validationTasks.map((task) => task()))
			.then(() => {
				form.reset();
				this.props.onSubmit(Object.create(event, {data: submitData}));
			})
	}

	render() {
		const {children, ...props} = this.props;
		const form = <form {...props} onSubmit={this.onSubmit}>{children}</form>;
		return super.render(form);
	}
}

function fetchFieldValuePair(control) {
	if (!(control instanceof HTMLElement)) return;
	const field = control.id || control.getAttribute('field');

	if (isFormControl(control)) return {[field]: control.value || ''};
	if (isContentEditable(control)) return {[field]: control.textContent || ''};
}

function resetControl(control) {
	if (!(control instanceof HTMLElement)) return;
	if (isFormControl(control)) control.value = '';
	if (isContentEditable(control)) control.textContent = '';
}

const FormControls = ['INPUT', 'TEXTAREA', 'SELECT', 'CHECKBOX'];

function isFormControl(domNode) {
	if (!(domNode instanceof HTMLElement)) return false;
	const tagName = (domNode.tagName || '').toUpperCase();
	return FormControls.some((type) => (tagName === type));
}

function isContentEditable(domNode) {
	return (domNode instanceof HTMLElement) && domNode.hasAttribute('contenteditable');
}
