const React = require('react');
const ReactDOM = require('react-dom');

const lifecycle = require('decorators/lib/decorator-lifecycle');
const ReactOwnerRecord = require('decorators/lib/decorator-record-react-owner');
const KeyCodes = require('keycodes');

const getNativeComponentFromNode = require('react-tree-utils/lib/getNativeComponentFromNode');
const getClosestReactElementFromNode = require('react-tree-utils/lib/getClosestReactElementFromNode');

const SimpleEvent = require('./events/FakeEvent');
const ReactIrrelevantStates = require('./utils/ReactIrrelevantStates');

const ProgressStates = {
	VALIDATE: 'validate',
	SUBMIT: 'submit',
	END: 'end',
	ERROR: 'error'
};

@lifecycle.forClass({
	firstDidInstantiate(instance) {
		document.addEventListener('click', hideErrorTipsForAllForms, false)
	},
	lastWillUninstantiate(instance) {
		document.removeEventListener('click', hideErrorTipsForAllForms, false)
	}
})
@ReactOwnerRecord
class Form extends React.Component {
	static propTypes = {
		onValidate: React.PropTypes.func,
		onSubmit: React.PropTypes.func.isRequired
	};

	get readyState() {
		const form = ReactDOM.findDOMNode(this);
		if (!form) return ProgressStates.END;
		return form.dataset.readyState;
	}

	submit() {
		const target = ReactDOM.findDOMNode(this);
		const fakeEvent = SimpleEvent.getPooled('submit', { currentTarget: target, target });
		handleSubmit(fakeEvent);
	}

	render() {
		const { children, ...props } = this.props;
		return (
			<form {...props}
				onSubmit={handleSubmit}
				onKeyDown={checkValidityOnEnter}
				onFocus={hideErrorTips}
				onChange={checkValidityOnChange}>
				{children}
			</form>);
	}
}

module.exports = Form;

function handleSubmit(event) {
	event.preventDefault();
	event.stopPropagation();
	event.persist();

	const form = event.currentTarget;
	const owner = ReactOwnerRecord.getOwner(form, Form);
	if (!owner) return;
	const { props } = owner;

	Promise.resolve(true)
		.then(() => {
			// init
			setState({ readyState: ProgressStates.VALIDATE, error: null });
		})
		.then(() => {
			// validate at client
			if (form.checkValidity() === false)
				throw new Error('rejected by invalidity at client');
			return true;
		})
		.then(() => {
			// collect data.
			const data = {};
			if (isEmptyArray(form.elements)) return data;
			form.elements.forEach((element) => {
				data[element.name || element.id] = element.value;
			});
			return data;
		})
		.then((data) => {
			// custom validate, maybe at server.
			const { onValidate } = props;
			if (typeof onValidate !== 'function') return data;
			return Promise.resolve(onValidate(data))
				.then((valid) => {
					if (valid === false) throw new Error('rejected by `props.onValidateAtServer`');
					return data;
				});
		})
		.then((data) => {
			setState({ readyState: ProgressStates.SUBMIT });
			return data;
		})
		.then((data) => {
			// submit
			const { onSubmit } = props;
			if (typeof onSubmit !== 'function') return data;
			return onSubmit(Object.create(event, data));
		})
		.then(
			() => setState({ readyState: ProgressStates.END }),
			(reason) => setState({ readyState: ProgressStates.ERROR, error: reason })
		);

	function setState(state) {
		return ReactIrrelevantStates.setState(form, state);
	}
}

function checkValidityOnEnter(event) {
	if (event.which !== KeyCodes.ENTER) return;
	event.preventDefault(); // prevent default validation visualization.
	checkValidity({ target: event.target, type: 'enter' });
}

function checkValidityOnChange(event) {
	if (checkValidity(event)) showValidationMessage(event.target, null);
}

function checkValidity(event) {
	const target = event.target;
	const element = getClosestReactElementFromNode(target);
	if (!element) return true;

	const actions = element.props.validationActions;

	if (isEmptyArray(actions)) return true;
	if (actions.some((action) => (action === event.type))) return true;
	if (target.validity.valid) return true;

	showValidationMessage(target);
	return false;
}

function hideErrorTipsForAllForms(event) {
	const forms = document.forms;
	if (isEmptyArray(forms)) return;

	const activeElement = document.activeElement;

	forms.forEach((form) => {
		// check whether mounted by React
		if (!getNativeComponentFromNode(form)) return;
		const elements = form.elements;
		if (isEmptyArray(elements)) return;
		if (activeElement.form === form) {
			elements.forEach(handleMaybeActiveElement);
		} else {
			elements.forEach(handleInactiveElement);
		}
	});

	function handleMaybeActiveElement(element) {
		if (element === activeElement) hideErrorTips({ target: element });
		else checkValidity({ target: element, type: 'blur' });
	}

	function handleInactiveElement(element) {
		hideErrorTips({ target: element });
	}
}

function hideErrorTips(event) {
	showValidationMessage(event.target, null);
}

function showValidationMessage(element, message) {
	if (!(element instanceof HTMLElement)) return;
	if (message === undefined) message = element.validationMessage;

	const relevantElements = element.labels.slice();
	relevantElements.unshift(element);
	relevantElements.forEach((element) => {
		ReactIrrelevantStates.setState(element, { validationMessage: message })
	});
}

function isEmptyArray(array) {
	return array.length === 0;
}
