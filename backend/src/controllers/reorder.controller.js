const reorderChildren = ({ model, parentModel, getParentFilter, parentError }) =>
  async (req, res, next) => {
    try {
      const { ids } = req.body;
      const { parentModel: selectedParentModel = parentModel, parentFilter, childFilter } = getParentFilter(req);
      if (!(await selectedParentModel.exists(parentFilter))) {
        return res.status(404).json({ message: parentError });
      }

      const children = await model.find({ ...childFilter, deletedAt: null }).select("_id").lean();
      const childIds = new Set(children.map((child) => child._id.toString()));
      const requestedIds = new Set(ids);
      if (ids.length !== children.length || requestedIds.size !== ids.length ||
        ids.some((id) => !childIds.has(id))) {
        return res.status(400).json({ message: "ids must list every item exactly once" });
      }

      await model.bulkWrite(ids.map((id, index) => ({
        updateOne: {
          filter: { _id: id, ...childFilter, deletedAt: null },
          update: { $set: { order: index + 1 } }
        }
      })));
      return res.status(200).json({ data: ids.map((id, index) => ({ _id: id, order: index + 1 })) });
    } catch (error) {
      next(error);
    }
  };

module.exports = reorderChildren;
