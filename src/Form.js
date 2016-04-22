const _ = require('lodash');
const React = require('react');
const ReactDOM = require('react-dom');

const lifecycle = require('decorators/lib/decorator-lifecycle');
const ReactOwnerRecord = require('decorators/lib/decorator-record-react-owner');
const KeyCodes = require('keycodes');

const SimpleEvent = require('./events/FakeEvent');

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
		const fakeEvent = SimpleEvent.getPooled('submit', {currentTarget: target, target});
		handleSubmit(fakeEvent);
	}

	render() {
		const {children, ...props} = this.props;
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
	const {props} = owner;

	Promise.resolve(true)
		.then(() => {
			// init
			setState({readyState: ProgressStates.VALIDATE, error: null});
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
			if (_.isEmpty(form.elements)) return data;
			_.forEach(form.elements, (element) => {
				data[element.name || element.id] = element.value;
			});
			return data;
		})
		.then((data) => {
			// custom validate, maybe at server.
			const {onValidate} = props;
			if (!_.isFunction(onValidate)) return data;
			return Promise.resolve(onValidate(data))
				.then((valid) => {
					if (valid === false) throw new Error('rejected by `props.onValidateAtServer`');
					return data;
				});
		})
		.then((data) => {
			setState({readyState: ProgressStates.SUBMIT});
			return data;
		})
		.then((data) => {
			// submit
			const {onSubmit} = props;
			if (!_.isFunction(onSubmit)) return data;
			return onSubmit(_.assign(event, data));
		})
		.then(
			() => setState({readyState: ProgressStates.END}),
			(reason) => setState({readyState: ProgressStates.ERROR, error: reason})
		);

	function setState(state) {
		return ReactIrrelevantStates.setState(form, state);
	}
}

const ReactIrrelevantStates = {
	setState(element, state) {
		if (!_.isElement(element)) return;
		if (_.isEmpty(state)) return;

		const dataSet = element.dataset;
		_.forOwn(state, (value, key) => {
			if (value === null || value === false) {
				Reflect.deleteProperty(dataSet, key);
			} else if (value !== undefined) {
				dataSet[key] = value;
			}
		});
	},
	getState(element, key) {
		if (!_.isElement(element)) return;
		if (!key) return;
		return element.dataset[key];
	}
};

function checkValidityOnEnter(event) {
	if (event.which !== KeyCodes.ENTER) return;
	event.preventDefault(); // prevent default validation visualization.
	checkValidity({target: event.target, type: 'enter'});
}

function checkValidityOnChange(event) {
	if (checkValidity(event)) showValidationMessage(event.target, null);
}

function checkValidity(event) {
	const target = event.target;
	const element = getReactElementFormNode(target);
	if (!element) return true;

	const actions = element.props.validationActions;

	if (_.isEmpty(actions)) return true;
	if (!_.includes(actions, event.type)) return true;
	if (target.validity.valid) return true;

	showValidationMessage(target);
	return false;
}

function hideErrorTipsForAllForms(event) {
	const forms = document.forms;
	if (_.isEmpty(forms)) return;

	const activeElement = document.activeElement;

	_.forEach(forms, (form) => {
		// check whether mounted by React
		if (!getInstanceFromNode(form)) return;
		const elements = form.elements;
		if (_.isEmpty(elements)) return;
		if (activeElement.form === form) {
			_.forEach(elements, (element) => {
				if (element === activeElement) hideErrorTips({target: element});
				else checkValidity({target: element, type: 'blur'});
			});
		} else {
			_.forEach(elements, (element) => hideErrorTips({target: element}));
		}
	})
}

function hideErrorTips(event) {
	showValidationMessage(event.target, null);
}

function showValidationMessage(element, message) {
	if (!element) return;
	if (message === undefined) message = element.validationMessage;

	const relevantElements = _.slice(element.labels);
	relevantElements.unshift(element);
	_.forEach(relevantElements, (element) => {
		ReactIrrelevantStates.setState(element, {validationMessage: message})
	});
}

function getReactElementFormNode(node) {
	const component = getInstanceFromNode(node);
	if (!component) return null;
	return component._currentElement;
}

function getInstanceFromNode(node) {
	if (!node) return null;
	const ReactDOMComponentTree = require('react/lib/ReactDOMComponentTree');
	return ReactDOMComponentTree.getInstanceFromNode(node);
}
