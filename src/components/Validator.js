const React = require('react');
const classNames = require('classnames');

const mixin = require('react-component-specs/lib/mixin-react-component');
const Validatable = require('react-component-specs/lib/specs/lib/Validatable');

const RESTORE_INPUT_LISTENERS = Symbol('restore-input-listeners');

class Validator extends mixin(Validatable) {
	static displayName = 'Validator';
	static propTypes = {
		defaultMessage: React.PropTypes.string,
		successMessage: React.PropTypes.string.isRequired
	};

	componentDidMount() {
		this.addRestoreListener();
	}

	conponentDidUpdate() {
		this.addRestoreListener();
	}

	componentWillUnmount() {
		this.removeRestoreListener();
	}

	addRestoreListener() {
		const listeners = this[RESTORE_INPUT_LISTENERS] || (this[RESTORE_INPUT_LISTENERS] = []);

		this.removeRestoreListener();
		this.controls.forEach((control) => {
			if (!control) return;
			const unlisten = once(control, 'input', () => this.restore());
			listeners.push(unlisten);
		});
	}

	removeRestoreListener() {
		const listeners = this[RESTORE_INPUT_LISTENERS];
		if (!listeners || listeners.length === 0) return;
		listeners.forEach((unlisten) => unlisten());
		listeners.length = 0;
	}

	render() {
		const { defaultMessage, successMessage, className } = this.props;
		const { validateState } = this.state;
		const { ValidateState } = Validator;

		let message = defaultMessage;

		if (validateState === ValidateState.DEFAULT) message = defaultMessage;
		else if (validateState === ValidateState.SUCCESS) message = successMessage;
		else if (validateState === ValidateState.FAILED) message = this.validationMessage;

		className = classNames(className, { error: validateState === ValidateState.FAILED });

		return <label className={className}>{message}</label>;
	}
}

module.exports = Validator;

function once(eventTarget, event, listener) {
	eventTarget.addEventListener(event, listener_, false);

	return unlisten;

	function listener_(event) {
		listener(event);
		unlisten();
	}

	function unlisten() {
		eventTarget.removeEventListener(event, listener_, false);
	}
}
