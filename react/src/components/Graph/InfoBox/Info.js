
import React, { Component } from 'react';
import { withStyles } from '@material-ui/core/styles';
import Typography from '@material-ui/core/Typography';
import WikiCard from './WikiExtract';
import WikiButton from "./WikiButton";
import WebsiteButton from "./WebsiteButton";
import StatTitle from './StatTitle';

const maxLengths = {
    extension: 10000,
    mobile: 10000,
    browser: 10000
}

const styles = theme => ({
    card: {
        minWidth: 275,
    },
    bullet: {
        display: 'inline-block',
        margin: '0 2px',
        transform: 'scale(0.8)',
    },
    title: {
        marginBottom: 16,
        fontSize: 14,
        color: theme.palette.text.secondary,
        display: "inline-block"
    },
    pos: {
        marginBottom: 12,
        color: theme.palette.text.secondary,
    },
    container: {
        padding: theme.spacing.unit * 2
    }
});

const wikiCardDivStyle = {
    textAlign: 'justify',
    textJustify: 'auto'
};

const entityNameTypoStyle = {
    display: 'inline-block',
    marginRight: '10px',
    fontSize: 26
};

const entityLongNameTypoStyle = {
    display: 'inline-block',
};

class EntityCard extends Component {

    state = {
        paddingRight: 'unset',
        windowWidth: window.innerWidth
    };

    updateWidth = () => {

        var w = window,
            d = document,
            documentElement = d.documentElement,
            body = d.getElementsByTagName('body')[0],
            width = w.innerWidth || documentElement.clientWidth || body.clientWidth

        if (width < 950 || this.props.clientType === "extension") {
            this.setState({
                paddingRight: '55px',
            })
        } else {
            this.setState({
                paddingRight: 'unset',
            })
        }
    }

    componentWillMount() {
        const location = parseInt(this.props.match.params.entityId, 10);
        const persistedInfoBox = JSON.parse(localStorage.getItem('reduxPersist:infoBox'))

        if (persistedInfoBox && persistedInfoBox.data !== location) {
            localStorage.setItem('reduxPersist:infoBox', JSON.stringify({
                ...persistedInfoBox,
                data: location
            }))
        }

        this.updateWidth();
    }

    componentWillMount = () => {
        this.updateWidth();
    }


    componentDidMount() {
        window.addEventListener("resize", this.updateWidth);
    }


    componentWillUnmount() {
        window.removeEventListener("resize", this.updateWidth);
    }


    render() {

        const { classes, ...noClassProps } = this.props;
        const entityId = parseInt(this.props.match.params.entityId, 10);
        const entity = this.props.data.entities.ids[entityId];

        const style = {
            marginTop: this.props.clientType === 'mobile' ? '0px' : '8px',
            position: this.props.clientType === 'mobile' ? 'relative' : 'inherit'
        };

        return (
            <div style={style} className={classes.container}>


                <div style={{ paddingRight: this.state.paddingRight }}>
                    <Typography type="headline" style={entityNameTypoStyle}>
                        {entity.name}
                    </Typography>
                    <Typography type="body2" className={classes.title} style={entityLongNameTypoStyle}>
                        {entity.long_name}
                    </Typography>
                    <br />
                    <StatTitle entity={entity} translate={this.props.translate} ></StatTitle>
                </div>

                <WikiButton entity={entity} />
                <WebsiteButton entity={entity} translate={this.props.translate} />

                <div style={wikiCardDivStyle}>
                    <WikiCard {...noClassProps} maxLength={maxLengths[this.props.clientType]} />
                </div>
            </div>
        );

    }
}

export default withStyles(styles)(EntityCard);