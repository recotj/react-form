const React = require('react');
const classNames = require('classnames');

const mixin = require('react-component-specs/lib/mixin-react-component');
const Validatable = require('react-component-specs/lib/specs/lib/Validatable');

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

	addRestoreListener() {
		this.controls.forEach((control) => {
			if (!control) return;
			once(control, 'input', () => this.restore());
		});
	}

	render() {
		const { defaultMessage, successMessage, errorMessage, className } = this.props;
		const { validateState } = this.state;
		const { ValidateState } = Validator;

		let message = defaultMessage;

		if (validateState === ValidateState.DEFAULT) message = defaultMessage;
		else if (validateState === ValidateState.SUCCESS) message = successMessage;
		else if (validateState === ValidateState.FAILED) message = this.validationMessage;

		className = classNames(className, {error: validateState === ValidateState.FAILED});

		return <label className={className}>{message}</label>;
	}
}

module.exports = Validator;

function once(eventTarget, event, listener) {
	eventTarget.addEndEventListener(event, listener_, false);

	function listener_(event) {
		listener(event);
		eventTarget.removeEventListener(event, listener_, false);
	}
}
