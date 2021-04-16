import React, { Fragment, Component } from 'react';
import PropTypes from 'prop-types';
import Head from 'next/head';

import GTM from '../lib/gtm';
import withGTMConsumer from '../hoc/withGTMConsumer';
import httpErrors from '../lib/http-errors';

import Title from '../components/Title';
import StoryView from '../components/StoryView';

import pageQuery from '../gql/queries/pages/story.graphql';

const { NODE_ENV } = process.env;
const { log } = console;

class Story extends Component {
  constructor(props) {
    super(props);
    const { publishedStory, preview, gtm } = props;
    const {
      id,
      advertiser,
      publisher,
      path,
      title,
    } = publishedStory;

    this.tracker = gtm.createTracker({
      story_id: id,
      page_path: path,
      page_title: title,
      publisher_id: publisher.id,
      advertiser_id: advertiser.id,
      preview_mode: preview,
    });
  }

  componentDidMount() {
    this.tracker.pageLoad();
  }

  static async getInitialProps({
    req,
    res,
    query,
    apollo,
  }) {
    let preview = false;
    if (req) preview = Boolean(req.query.preview);

    const { id, publisherId } = query;
    const input = { id, preview };
    const variables = { input, publisherId };

    const { data } = await apollo.query({ query: pageQuery, variables });
    const { publishedStory } = data || {};
    if (!publishedStory) {
      // No story was found for this id. Return a 404.
      throw httpErrors.notFound(`No story was found for id '${id}'`);
    }

    // Check for and redirect to canonical url
    const { url } = publishedStory;
    if (req) { // Only run on backend requests
      const requestUrl = `${req.protocol}://${req.get('host')}${req.originalUrl}`;
      if (url !== requestUrl) {
        // Build backend equivalent of `window.location.search` (?foo=bar&bat=baz)
        const queryString = Object.keys(req.query)
          .map(key => ([encodeURIComponent(key), encodeURIComponent(req.query[key])].join('=')))
          .reduce((str, kv, i) => [
            ...(i === 0 ? ['?'] : []),
            str,
            ...(str.length ? ['&'] : []),
            kv,
          ].join(''), '');
        const toUrl = `${url}${queryString}`;
        if (NODE_ENV !== 'production') {
          log('Aborting redirect! In production, this page would redirect to ', toUrl);
        } else {
          res.redirect(301, toUrl);
        }
      }
    } else { // frontend requests
      const requestUrl = `${window.location.href}`.split('?', 1)[0];
      if (url !== requestUrl) {
        const toUrl = url + window.location.search;
        if (NODE_ENV !== 'production') {
          log('Aborting redirect! In production, this page would redirect to ', toUrl);
        } else {
          window.location.href = toUrl;
        }
      }
    }
    return { publishedStory, preview };
  }

  render() {
    const { preview, publishedStory } = this.props;
    const {
      primaryImage,
      publishedAt,
      publisher,
      teaser,
      title,
      updatedAt,
      url,
    } = publishedStory;
    const { src } = primaryImage || {};
    return (
      <Fragment>
        <Title value={title} />
        <Head>
          {/* SEO */}
          <link rel="canonical" href={url} />
          <meta name="description" content={teaser} />
          {src && <meta name="image" content={src} />}

          {/* Schema.org */}
          <meta item-prop="name" content={title} />
          <meta item-prop="description" content={teaser} />
          {src && <meta item-prop="image" content={src} />}

          {/* Twitter */}
          <meta name="twitter:card" content="summary" />
          <meta name="twitter:title" content={title} />
          <meta name="twitter:description" content={teaser} />
          {src && <meta name="twitter:image:src" content={src} />}

          {/* OpenGraph (Facebook, etc.) */}
          <meta name="og:title" content={title} />
          <meta name="og:description" content={teaser} />
          {/* @todo Create a new focal point preview for FB's 1200x630 ratio */}
          {src && <meta name="og:image" content={src} />}
          <meta name="og:url" content={url} />
          <meta name="og:site_name" content={publisher.name} />
          <meta name="og:locale" content="en_US" />
          <meta name="og:type" content="article" />

          {/* OpenGraph Article */}
          <meta name="article:published_time" content={publishedAt} />
          <meta name="article:modified_time" content={updatedAt} />

          {/* @todo Eventually use the publisher context. */}
          <meta name="native-x:publisher" content={publisher.name} />
        </Head>
        <StoryView {...publishedStory} tracker={this.tracker} preview={preview} />
      </Fragment>
    );
  }
}

Story.defaultProps = {
  preview: false,
};

Story.propTypes = {
  gtm: PropTypes.instanceOf(GTM).isRequired,
  preview: PropTypes.bool,
  publishedStory: PropTypes.shape({
    id: PropTypes.string,
  }).isRequired,
};

export default withGTMConsumer(Story);
