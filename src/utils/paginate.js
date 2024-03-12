const paginate = async (page, limit, data) => {
    const lim = parseInt(limit);
    const pag = parseInt(page);
    const skip = lim * (pag - 1);
    return data.slice(skip, skip + lim);
};
export { paginate };
